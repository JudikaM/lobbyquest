const crypto = require('node:crypto');
const db = require('./db');
const { TIMEZONES, DEFAULT_TIMEZONE, localToUtc, formatMoment } = require('./time');

const KINDS = { mabar: 'Mabar', nongkrong: 'Nongkrong' };
const LIMITS = { titleMin: 3, title: 100, description: 1000, location: 150 };
const MIN_SLOTS = 2;
const MAX_SLOTS = 10;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Memeriksa isian form agenda. Mengembalikan `values` (isian mentah untuk
// ditampilkan ulang), `errors` (pesan untuk pengguna), dan `agenda` (data
// siap simpan, hanya jika tidak ada error).
function validateAgenda(body = {}, now = new Date()) {
  const starts = list(body.start);
  const ends = list(body.end);
  const values = {
    title: text(body.title),
    kind: text(body.kind),
    description: text(body.description),
    location: text(body.location),
    timezone: text(body.timezone) || DEFAULT_TIMEZONE,
    slots: starts.map((start, i) => ({ start: text(start), end: text(ends[i]) })),
  };
  const errors = [];
  // Object.hasOwn agar nama bawaan objek seperti "constructor" atau
  // "toString" tidak dianggap sebagai pilihan yang sah.
  const validKind = Object.hasOwn(KINDS, values.kind);
  const validTimezone = Object.hasOwn(TIMEZONES, values.timezone);

  if (values.title.length < LIMITS.titleMin || values.title.length > LIMITS.title) {
    errors.push(`Judul wajib diisi, ${LIMITS.titleMin}–${LIMITS.title} karakter.`);
  }
  if (!validKind) {
    errors.push('Pilih jenis agenda: mabar atau nongkrong.');
  }
  if (values.description.length > LIMITS.description) {
    errors.push(`Deskripsi maksimal ${LIMITS.description} karakter.`);
  }
  if (values.location.length > LIMITS.location) {
    errors.push(`Lokasi atau platform maksimal ${LIMITS.location} karakter.`);
  }
  if (!validTimezone) {
    errors.push('Zona waktu tidak dikenal.');
  }

  const slots = [];
  const seen = new Set();
  values.slots.forEach((slot, i) => {
    const label = `Pilihan waktu ${i + 1}`;
    if (!slot.start && !slot.end) return;
    if (!slot.start || !slot.end) {
      errors.push(`${label}: isi waktu mulai dan selesai.`);
      return;
    }
    if (!validTimezone) return;

    const startsAt = localToUtc(slot.start, values.timezone);
    const endsAt = localToUtc(slot.end, values.timezone);
    if (!startsAt || !endsAt) {
      errors.push(`${label}: format tanggal atau jam tidak valid.`);
      return;
    }
    if (endsAt <= startsAt) {
      errors.push(`${label}: waktu selesai harus setelah waktu mulai.`);
      return;
    }
    if (startsAt <= now) {
      errors.push(
        `${label}: waktu mulai (${formatMoment(startsAt, values.timezone)}) sudah lewat. ` +
        `Sekarang ${formatMoment(now, values.timezone)}.`
      );
      return;
    }

    const key = `${startsAt.toISOString()}|${endsAt.toISOString()}`;
    if (seen.has(key)) {
      errors.push(`${label}: sama dengan pilihan waktu lain.`);
      return;
    }
    seen.add(key);
    slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
  });

  const filled = values.slots.filter((slot) => slot.start || slot.end).length;
  if (filled < MIN_SLOTS || filled > MAX_SLOTS) {
    errors.push(`Isi ${MIN_SLOTS} sampai ${MAX_SLOTS} pilihan waktu.`);
  }

  if (errors.length) return { values, errors, agenda: null };

  return {
    values,
    errors,
    agenda: {
      title: values.title,
      kind: values.kind,
      description: values.description || null,
      location: values.location || null,
      timezone: values.timezone,
      slots,
    },
  };
}

const insertAgenda = db.prepare(`
  INSERT INTO agendas (slug, title, kind, description, location, timezone, created_at)
  VALUES (@slug, @title, @kind, @description, @location, @timezone, @createdAt)
`);
const insertTimeOption = db.prepare(`
  INSERT INTO time_options (agenda_id, starts_at, ends_at) VALUES (?, ?, ?)
`);

// Menyimpan agenda beserta semua pilihan waktunya dalam satu transaksi:
// jika satu insert gagal, tidak ada yang tersimpan. Mengembalikan slug.
const createAgenda = db.transaction((agenda) => {
  // 12 byte acak = 96 bit, ditulis sebagai 16 karakter base64url.
  const slug = crypto.randomBytes(12).toString('base64url');
  const { lastInsertRowid } = insertAgenda.run({
    slug,
    title: agenda.title,
    kind: agenda.kind,
    description: agenda.description,
    location: agenda.location,
    timezone: agenda.timezone,
    createdAt: new Date().toISOString(),
  });
  for (const slot of agenda.slots) {
    insertTimeOption.run(lastInsertRowid, slot.startsAt, slot.endsAt);
  }
  return slug;
});

const selectAgenda = db.prepare('SELECT * FROM agendas WHERE slug = ?');
const selectTimeOptions = db.prepare(
  'SELECT * FROM time_options WHERE agenda_id = ? ORDER BY starts_at, ends_at'
);

function findAgendaBySlug(slug) {
  if (!/^[A-Za-z0-9_-]{16}$/.test(slug)) return null;

  const agenda = selectAgenda.get(slug);
  if (!agenda) return null;
  return { ...agenda, timeOptions: selectTimeOptions.all(agenda.id) };
}

module.exports = {
  KINDS,
  LIMITS,
  MIN_SLOTS,
  MAX_SLOTS,
  validateAgenda,
  createAgenda,
  findAgendaBySlug,
};
