const express = require('express');
const agendas = require('./agendas');
const votes = require('./votes');
const { TIMEZONES, DEFAULT_TIMEZONE, formatRange } = require('./time');

const router = express.Router();

const PRIVACY_NOTICE =
  'Siapa pun yang memiliki tautan dapat melihat agenda ini. ' +
  'Hindari memasukkan data pribadi atau sensitif.';
const PARTICIPANT_COOKIE = 'lq_peserta';

function renderForm(res, values, errors = []) {
  // Form selalu menampilkan minimal dua baris pilihan waktu.
  const slots = [...values.slots];
  while (slots.length < agendas.MIN_SLOTS) slots.push({ start: '', end: '' });

  res.render('agenda-form', {
    title: 'Buat agenda',
    values: { ...values, slots },
    errors,
    privacyNotice: PRIVACY_NOTICE,
    kinds: agendas.KINDS,
    timezones: TIMEZONES,
    limits: agendas.LIMITS,
    maxSlots: agendas.MAX_SLOTS,
  });
}

// Ambil satu cookie dari header tanpa dependency tambahan.
function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return null;
}

function findCurrentParticipant(req, agenda) {
  return votes.findParticipant(agenda.id, readCookie(req, PARTICIPANT_COOKIE));
}

// Format yang diterima oleh POST form. req.is() bernilai null jika request
// tidak punya body (diperlakukan sebagai form kosong) dan false jika body
// memakai format lain.
function rejectUnsupportedBody(req, res) {
  if (req.is('application/x-www-form-urlencoded') !== false) return false;

  res.status(415).render('error', {
    title: 'Format tidak didukung',
    message: 'Kirim data melalui form yang tersedia di halaman.',
  });
  return true;
}

function renderAgenda(req, res, agenda, { voteValues, voteErrors = [] } = {}) {
  const participant = findCurrentParticipant(req, agenda);
  const voters = votes.tallyVotes(agenda);
  const topCount = Math.max(0, ...[...voters.values()].map((names) => names.length));

  // noindex hanya meminta mesin pencari tidak mengindeks; ini bukan kontrol
  // akses. Siapa pun yang tahu tautannya tetap bisa membuka halaman ini.
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  res.render('agenda', {
    title: agenda.title,
    noindex: true,
    agenda,
    kindLabel: agendas.KINDS[agenda.kind],
    timezoneLabel: `${TIMEZONES[agenda.timezone]} (${agenda.timezone})`,
    timeOptions: agenda.timeOptions.map((option) => {
      const names = voters.get(option.id);
      return {
        id: option.id,
        label: formatRange(option.starts_at, option.ends_at, agenda.timezone),
        voters: names,
        isTop: topCount > 0 && names.length === topCount,
      };
    }),
    participantCount: votes.participantCount(agenda.id),
    participant,
    voteValues: voteValues || {
      name: participant ? participant.name : '',
      optionIds: participant ? participant.optionIds : [],
    },
    voteErrors,
    nameMax: votes.NAME_MAX,
    shareUrl: `${req.protocol}://${req.get('host')}/a/${agenda.slug}`,
    justCreated: req.query.baru === '1',
    voteSaved: req.query.tersimpan === '1',
    privacyNotice: PRIVACY_NOTICE,
  });
}

router.get('/', (req, res) => {
  res.render('home', { title: 'Beranda' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/agenda/baru', (req, res) => {
  const emptySlot = { start: '', end: '' };
  renderForm(res, {
    title: '',
    kind: '',
    description: '',
    location: '',
    timezone: DEFAULT_TIMEZONE,
    slots: [emptySlot, emptySlot, emptySlot],
  });
});

router.post('/agenda', (req, res) => {
  if (rejectUnsupportedBody(req, res)) return;

  const { values, errors, agenda } = agendas.validateAgenda(req.body);
  if (errors.length) {
    res.status(422);
    return renderForm(res, values, errors);
  }

  const slug = agendas.createAgenda(agenda);
  res.redirect(303, `/a/${slug}?baru=1`);
});

router.get('/a/:slug', (req, res, next) => {
  const agenda = agendas.findAgendaBySlug(req.params.slug);
  if (!agenda) return next();

  renderAgenda(req, res, agenda);
});

router.post('/a/:slug/suara', (req, res, next) => {
  const agenda = agendas.findAgendaBySlug(req.params.slug);
  if (!agenda) return next();
  if (rejectUnsupportedBody(req, res)) return;

  const { values, errors } = votes.validateVote(req.body, agenda);
  if (errors.length) {
    res.status(422);
    return renderAgenda(req, res, agenda, { voteValues: values, voteErrors: errors });
  }

  let newToken;
  try {
    newToken = votes.saveVote(agenda, findCurrentParticipant(req, agenda), values);
  } catch (error) {
    if (error.code !== 'PARTICIPANT_LIMIT') throw error;
    res.status(409);
    return renderAgenda(req, res, agenda, {
      voteValues: values,
      voteErrors: [`Agenda ini sudah mencapai batas ${votes.MAX_PARTICIPANTS} peserta.`],
    });
  }

  if (newToken) {
    // Cookie hanya dikirim ke halaman agenda ini dan tidak bisa dibaca
    // JavaScript. SameSite=Lax mencegah situs lain mengubah suara peserta.
    res.cookie(PARTICIPANT_COOKIE, newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      path: `/a/${agenda.slug}`,
      maxAge: 180 * 24 * 60 * 60 * 1000,
    });
  }
  res.redirect(303, `/a/${agenda.slug}?tersimpan=1#suara`);
});

module.exports = router;
