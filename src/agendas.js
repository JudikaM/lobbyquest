const crypto = require('node:crypto');
const db = require('./db');
const { TIMEZONES, DEFAULT_TIMEZONE, localToUtc, formatMoment } = require('./time');
const { cleanText, list } = require('./text');
const managers = require('./managers');

const KINDS = { mabar: 'Mabar', nongkrong: 'Nongkrong' };
const LIMITS = { titleMin: 3, title: 100, description: 1000, location: 150 };
const MIN_SLOTS = 2;
const MAX_SLOTS = 10;

function text(value) {
  return cleanText(value);
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
    description: cleanText(body.description, { multiline: true }),
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
  INSERT INTO agendas
    (slug, title, kind, description, location, timezone, created_at, manager_token_hash)
  VALUES
    (@slug, @title, @kind, @description, @location, @timezone, @createdAt, @managerTokenHash)
`);
const insertTimeOption = db.prepare(`
  INSERT INTO time_options (agenda_id, starts_at, ends_at) VALUES (?, ?, ?)
`);

// Menyimpan agenda beserta semua pilihan waktunya dalam satu transaksi:
// jika satu insert gagal, tidak ada yang tersimpan. Mengembalikan slug dan
// token pengelola (hanya hash-nya yang disimpan di database).
const createAgenda = db.transaction((agenda) => {
  // 12 byte acak = 96 bit, ditulis sebagai 16 karakter base64url.
  const slug = crypto.randomBytes(12).toString('base64url');
  const manager = managers.generateToken();
  const { lastInsertRowid } = insertAgenda.run({
    slug,
    title: agenda.title,
    kind: agenda.kind,
    description: agenda.description,
    location: agenda.location,
    timezone: agenda.timezone,
    createdAt: new Date().toISOString(),
    managerTokenHash: manager.hash,
  });
  for (const slot of agenda.slots) {
    insertTimeOption.run(lastInsertRowid, slot.startsAt, slot.endsAt);
  }
  return { slug, managerToken: manager.token };
});

// Hash token pengelola sengaja tidak ikut dipilih agar tidak pernah sampai
// ke template.
const selectAgenda = db.prepare(`
  SELECT id, slug, title, kind, description, location, timezone, created_at,
         final_option_id, finalized_at,
         manager_token_hash IS NOT NULL AS has_manager
  FROM agendas WHERE slug = ?
`);
const selectTimeOptions = db.prepare(
  'SELECT * FROM time_options WHERE agenda_id = ? ORDER BY starts_at, ends_at'
);

const STATUS_LABELS = {
  voting: 'Voting berlangsung',
  scheduled: 'Waktu ditetapkan',
  done: 'Selesai',
  expired: 'Tidak jadi ditetapkan',
};

// Status agenda dihitung dari data, bukan disimpan:
// - voting: belum ada waktu final dan masih ada pilihan di masa depan;
// - scheduled: waktu final sudah ditetapkan dan belum selesai;
// - done: waktu final sudah selesai;
// - expired: semua pilihan sudah lewat tanpa waktu final.
function agendaStatus(agenda, now = new Date()) {
  if (agenda.finalOption) {
    return new Date(agenda.finalOption.ends_at) <= now ? 'done' : 'scheduled';
  }
  const hasFuture = agenda.timeOptions.some((option) => new Date(option.starts_at) > now);
  return hasFuture ? 'voting' : 'expired';
}

function findAgendaBySlug(slug, now = new Date()) {
  if (typeof slug !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(slug)) return null;

  const row = selectAgenda.get(slug);
  if (!row) return null;
  const timeOptions = selectTimeOptions.all(row.id);
  const agenda = {
    ...row,
    timeOptions,
    finalOption: timeOptions.find((option) => option.id === row.final_option_id) || null,
  };
  agenda.status = agendaStatus(agenda, now);
  return agenda;
}

// Pilihan waktu yang boleh ditetapkan: milik agenda ini dan belum dimulai.
function finalizableOption(agenda, value, now = new Date()) {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  const option = agenda.timeOptions.find((candidate) => candidate.id === id);
  if (!option || new Date(option.starts_at) <= now) return null;
  return option;
}

const updateFinal = db.prepare(
  'UPDATE agendas SET final_option_id = ?, finalized_at = ? WHERE id = ?'
);
const resetRsvps = db.prepare(
  'UPDATE participants SET rsvp = NULL, rsvp_at = NULL WHERE agenda_id = ?'
);

// Menetapkan (optionId) atau membatalkan (null) waktu final. Jika waktunya
// berubah, konfirmasi kehadiran lama tidak berlaku lagi dan dikosongkan.
const setFinalOption = db.transaction((agenda, optionId) => {
  if (optionId === agenda.final_option_id) return;
  updateFinal.run(optionId, optionId ? new Date().toISOString() : null, agenda.id);
  resetRsvps.run(agenda.id);
});

const deleteAgendaStatement = db.prepare('DELETE FROM agendas WHERE id = ?');

// Menghapus agenda beserta pilihan waktu, peserta, dan suaranya (cascade).
function deleteAgenda(agenda) {
  deleteAgendaStatement.run(agenda.id);
}

module.exports = {
  KINDS,
  LIMITS,
  MIN_SLOTS,
  MAX_SLOTS,
  STATUS_LABELS,
  validateAgenda,
  createAgenda,
  agendaStatus,
  findAgendaBySlug,
  finalizableOption,
  setFinalOption,
  deleteAgenda,
};
