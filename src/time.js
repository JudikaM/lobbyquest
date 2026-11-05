// Zona waktu yang bisa dipilih. Ketiganya tanpa daylight saving time.
const TIMEZONES = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

// Selisih (ms) antara jam lokal di timeZone dan UTC pada saat timestamp.
function offsetMs(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(timestamp);
  const get = (type) => Number(parts.find((part) => part.type === type).value);

  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - timestamp;
}

// Mengubah nilai input datetime-local ("YYYY-MM-DDTHH:mm") yang dibaca
// sebagai jam lokal di timeZone menjadi Date UTC. Mengembalikan null
// jika format atau tanggalnya tidak valid.
function localToUtc(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(asUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  return new Date(asUtc - offsetMs(asUtc, timeZone));
}

// Kebalikan localToUtc: nilai untuk input datetime-local di timeZone,
// dibulatkan ke atas ke menit berikutnya. Dipakai untuk atribut `min`.
function utcToLocalInput(date, timeZone) {
  const timestamp = Math.ceil(date.getTime() / 60000) * 60000;
  return new Date(timestamp + offsetMs(timestamp, timeZone)).toISOString().slice(0, 16);
}

// Contoh: "Kamis, 29 Oktober 2026, 09.10 WIB".
function formatMoment(date, timeZone) {
  const text = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${text} ${TIMEZONES[timeZone] || timeZone}`;
}

// Contoh: "1 Desember 2026".
function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone, day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}

// Contoh: "Minggu, 1 November 2026, 19.00–22.00 WIB".
function formatRange(startsAt, endsAt, timeZone) {
  const date = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = new Intl.DateTimeFormat('id-ID', { timeZone, hour: '2-digit', minute: '2-digit' });
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const zone = TIMEZONES[timeZone] || timeZone;

  if (date.format(start) === date.format(end)) {
    return `${date.format(start)}, ${time.format(start)}–${time.format(end)} ${zone}`;
  }
  return `${date.format(start)}, ${time.format(start)} – ${date.format(end)}, ${time.format(end)} ${zone}`;
}

function clean(text) {
  return text.replace(/\.$/, '');
}

// Komponen tampilan untuk petak tanggal dan baris waktu, misalnya
// { weekday: 'Sab', day: '7', month: 'Nov', range: '19.00–22.00',
//   date: 'Sabtu, 7 November 2026', zone: 'WIB', crossesDay: false }.
function dateParts(startsAt, endsAt, timeZone) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const fmt = (options) => new Intl.DateTimeFormat('id-ID', { timeZone, ...options });
  const longDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = fmt({ hour: '2-digit', minute: '2-digit' });
  const crossesDay = longDate.format(start) !== longDate.format(end);
  return {
    weekday: clean(fmt({ weekday: 'short' }).format(start)),
    day: fmt({ day: 'numeric' }).format(start),
    month: clean(fmt({ month: 'short' }).format(start)),
    range: `${time.format(start)}–${time.format(end)}`,
    date: crossesDay
      ? `${longDate.format(start)} – ${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(end)}`
      : longDate.format(start),
    zone: TIMEZONES[timeZone] || timeZone,
    crossesDay,
  };
}

module.exports = {
  dateParts,
  TIMEZONES,
  DEFAULT_TIMEZONE,
  localToUtc,
  utcToLocalInput,
  formatMoment,
  formatDate,
  formatRange,
};
