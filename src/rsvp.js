const db = require('./db');
const { validateName, upsertParticipant } = require('./participants');

const RSVP_LABELS = { yes: 'Hadir', maybe: 'Mungkin', no: 'Tidak hadir' };

function validateRsvp(body = {}) {
  const errors = [];
  const name = validateName(body.name, errors);
  const status = typeof body.status === 'string' && Object.hasOwn(RSVP_LABELS, body.status)
    ? body.status
    : '';
  if (!status) errors.push('Pilih salah satu: hadir, mungkin, atau tidak hadir.');
  return { values: { name, status }, errors };
}

const updateRsvp = db.prepare(
  'UPDATE participants SET rsvp = ?, rsvp_at = ? WHERE id = ?'
);
const selectRsvps = db.prepare(`
  SELECT name, rsvp FROM participants
  WHERE agenda_id = ?
  ORDER BY rsvp_at IS NULL, rsvp_at, created_at, id
`);

// Menyimpan konfirmasi kehadiran. Mengembalikan token baru untuk peserta
// baru, atau null jika memakai token lama.
const saveRsvp = db.transaction((agenda, participant, { name, status }) => {
  const now = new Date().toISOString();
  const { id, token } = upsertParticipant(agenda.id, participant, name, now);
  updateRsvp.run(status, now, id);
  return token;
});

// Nama peserta dikelompokkan per status; `pending` berisi peserta yang
// belum mengonfirmasi.
function rsvpSummary(agendaId) {
  const summary = { yes: [], maybe: [], no: [], pending: [] };
  for (const row of selectRsvps.all(agendaId)) {
    summary[row.rsvp || 'pending'].push(row.name);
  }
  return summary;
}

module.exports = { RSVP_LABELS, validateRsvp, saveRsvp, rsvpSummary };
