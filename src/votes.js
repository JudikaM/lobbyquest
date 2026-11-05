const db = require('./db');
const { list } = require('./text');
const { validateName, upsertParticipant } = require('./participants');

// Memeriksa isian form suara untuk agenda tertentu. `optionIds` hanya berisi
// ID pilihan waktu milik agenda ini.
function validateVote(body = {}, agenda) {
  const errors = [];
  const name = validateName(body.name, errors);
  const allowed = new Set(agenda.timeOptions.map((option) => option.id));
  const optionIds = [];

  for (const value of list(body.option)) {
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
    if (!allowed.has(id)) {
      errors.push('Ada pilihan waktu yang tidak dikenal.');
      break;
    }
    if (!optionIds.includes(id)) optionIds.push(id);
  }

  return { values: { name, optionIds }, errors };
}

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

function participantOptionIds(participant) {
  return participant ? selectParticipantVotes.all(participant.id) : [];
}

// Menyimpan suara dalam satu transaksi. Peserta lama (token cocok) diganti
// seluruh pilihannya; peserta baru dibuat dengan token acak. Mengembalikan
// token baru, atau null jika memakai token lama. Melempar error dengan
// `code = 'PARTICIPANT_LIMIT'` jika agenda sudah penuh.
const saveVote = db.transaction((agenda, participant, { name, optionIds }) => {
  const now = new Date().toISOString();
  const { id, token } = upsertParticipant(agenda.id, participant, name, now);
  deleteVotes.run(id);
  for (const optionId of optionIds) insertVote.run(id, optionId);
  return token;
});

// Mengelompokkan pemilih ({ id, name }) per pilihan waktu.
function tallyVotes(agenda) {
  const voters = new Map(agenda.timeOptions.map((option) => [option.id, []]));
  for (const row of selectVotes.all(agenda.id)) {
    voters.get(row.time_option_id).push({ id: row.participant_id, name: row.name });
  }
  return voters;
}

module.exports = {
  validateVote,
  participantOptionIds,
  saveVote,
  tallyVotes,
};
