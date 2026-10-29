const crypto = require('node:crypto');
const db = require('./db');

const NAME_MAX = 40;
const MAX_PARTICIPANTS = 50;

// Token peserta hanya disimpan sebagai hash, sehingga isi database saja
// tidak cukup untuk menyamar sebagai peserta.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function list(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Memeriksa isian form suara untuk agenda tertentu. `optionIds` hanya berisi
// ID pilihan waktu milik agenda ini.
function validateVote(body = {}, agenda) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const allowed = new Set(agenda.timeOptions.map((option) => option.id));
  const submitted = list(body.option);
  const optionIds = [];
  const errors = [];

  if (name.length < 1 || name.length > NAME_MAX) {
    errors.push(`Nama wajib diisi, 1–${NAME_MAX} karakter.`);
  }

  for (const value of submitted) {
    const id = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!allowed.has(id)) {
      errors.push('Ada pilihan waktu yang tidak dikenal.');
      break;
    }
    if (!optionIds.includes(id)) optionIds.push(id);
  }

  return { values: { name, optionIds }, errors };
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
const updateParticipant = db.prepare(
  'UPDATE participants SET name = ?, updated_at = ? WHERE id = ?'
);
const deleteVotes = db.prepare('DELETE FROM votes WHERE participant_id = ?');
const insertVote = db.prepare(
  'INSERT INTO votes (participant_id, time_option_id) VALUES (?, ?)'
);
const selectVotes = db.prepare(`
  SELECT v.time_option_id, p.id AS participant_id, p.name
  FROM votes v
  JOIN participants p ON p.id = v.participant_id
  WHERE p.agenda_id = ?
  ORDER BY p.created_at, p.id
`);
const selectParticipantVotes = db.prepare(
  'SELECT time_option_id FROM votes WHERE participant_id = ?'
).pluck();

function findParticipant(agendaId, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null;

  const participant = selectParticipant.get(agendaId, hashToken(token));
  if (!participant) return null;
  return { ...participant, optionIds: selectParticipantVotes.all(participant.id) };
}

// Menyimpan suara dalam satu transaksi. Peserta lama (token cocok) diganti
// seluruh pilihannya; peserta baru dibuat dengan token acak. Mengembalikan
// token baru, atau null jika memakai token lama. Melempar error dengan
// `code = 'PARTICIPANT_LIMIT'` jika agenda sudah penuh.
const saveVote = db.transaction((agenda, participant, { name, optionIds }) => {
  const now = new Date().toISOString();
  let participantId;
  let newToken = null;

  if (participant) {
    participantId = participant.id;
    updateParticipant.run(name, now, participantId);
    deleteVotes.run(participantId);
  } else {
    if (countParticipants.get(agenda.id) >= MAX_PARTICIPANTS) {
      const error = new Error('Participant limit reached');
      error.code = 'PARTICIPANT_LIMIT';
      throw error;
    }
    // 24 byte acak = 32 karakter base64url.
    newToken = crypto.randomBytes(24).toString('base64url');
    participantId = insertParticipant.run(agenda.id, hashToken(newToken), name, now, now)
      .lastInsertRowid;
  }

  for (const id of optionIds) insertVote.run(participantId, id);
  return newToken;
});

// Mengelompokkan nama pemilih per pilihan waktu.
function tallyVotes(agenda) {
  const voters = new Map(agenda.timeOptions.map((option) => [option.id, []]));
  for (const row of selectVotes.all(agenda.id)) {
    voters.get(row.time_option_id).push(row.name);
  }
  return voters;
}

function participantCount(agendaId) {
  return countParticipants.get(agendaId);
}

module.exports = {
  NAME_MAX,
  MAX_PARTICIPANTS,
  validateVote,
  findParticipant,
  saveVote,
  tallyVotes,
  participantCount,
};
