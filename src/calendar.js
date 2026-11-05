const crypto = require('node:crypto');

// Escape nilai TEXT sesuai RFC 5545 bagian 3.3.11.
function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// "2026-11-07T12:00:00.000Z" → "20261107T120000Z".
function icsDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Melipat baris lebih dari 75 oktet (RFC 5545 bagian 3.1) tanpa memotong
// karakter UTF-8 di tengah.
function fold(line) {
  const out = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    const limit = out.length ? 74 : 75;
    if (size + bytes > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}

// UID stabil tanpa memuat slug agenda secara langsung.
function eventUid(slug) {
  return `${crypto.createHash('sha256').update(`uid:${slug}`).digest('hex').slice(0, 32)}@lobbyquest`;
}

function buildIcs({ slug, title, description, location, url, startsAt, endsAt, now = new Date() }) {
  const details = [description, url].filter(Boolean).join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LobbyQuest//Agenda//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventUid(slug)}`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(startsAt)}`,
    `DTEND:${icsDate(endsAt)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(details)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  lines.push(`URL:${url}`, 'END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

// Tautan "tambahkan ke Google Calendar". Data baru terkirim ke Google jika
// pengguna mengetuk tautannya.
function googleCalendarUrl({ title, description, location, url, startsAt, endsAt }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${icsDate(startsAt)}/${icsDate(endsAt)}`,
    details: [description, url].filter(Boolean).join('\n\n'),
  });
  if (location) params.set('location', location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

module.exports = { escapeText, icsDate, fold, buildIcs, googleCalendarUrl };
