const crypto = require('node:crypto');
const db = require('./db');
const { cleanText } = require('./text');

const NAME_MAX = 40;
const MAX_PARTICIPANTS = 50;
const COOKIE = 'lq_peserta';
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

// Token peserta hanya disimpan sebagai hash, sehingga isi database saja
// tidak cukup untuk menyamar sebagai peserta.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function validateName(value, errors) {
  const name = cleanText(value);
  if (name.length < 1 || name.length > NAME_MAX) {
    errors.push(`Nama wajib diisi, 1–${NAME_MAX} karakter.`);
  }
  return name;
}

const selectParticipant = db.prepare(
  'SELECT * FROM participants WHERE agenda_id = ? AND token_hash = ?'
);
const countParticipants = db.prepare(
  'SELECT count(*) FROM participants WHERE agenda_id = ?'
).pluck();
const insertParticipant = db.prepare(`
  INSERT INTO participants (agenda_id, token_hash, name, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);
const updateName = db.prepare(
  'UPDATE participants SET name = ?, updated_at = ? WHERE id = ?'
);

// Mencari peserta dari token di cookie. Token dengan format salah langsung
// ditolak tanpa menyentuh database.
function findParticipant(agendaId, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  return selectParticipant.get(agendaId, hashToken(token)) || null;
}

class ParticipantLimitError extends Error {
  constructor() {
    super('Participant limit reached');
    this.code = 'PARTICIPANT_LIMIT';
  }
}

// Memperbarui nama peserta lama, atau membuat peserta baru dengan token
// acak. Harus dipanggil di dalam transaksi. Mengembalikan { id, token },
// dengan token null untuk peserta lama.
function upsertParticipant(agendaId, participant, name, now) {
  if (participant) {
    updateName.run(name, now, participant.id);
    return { id: participant.id, token: null };
  }
  if (countParticipants.get(agendaId) >= MAX_PARTICIPANTS) {
    throw new ParticipantLimitError();
  }
  // 24 byte acak = 32 karakter base64url.
  const token = crypto.randomBytes(24).toString('base64url');
  const { lastInsertRowid } = insertParticipant.run(agendaId, hashToken(token), name, now, now);
  return { id: lastInsertRowid, token };
}

function participantCount(agendaId) {
  return countParticipants.get(agendaId);
}

module.exports = {
  NAME_MAX,
  MAX_PARTICIPANTS,
  COOKIE,
  COOKIE_MAX_AGE,
  hashToken,
  validateName,
  findParticipant,
  upsertParticipant,
  participantCount,
};
