const express = require('express');
const agendas = require('./agendas');
const votes = require('./votes');
const participants = require('./participants');
const { TIMEZONES, DEFAULT_TIMEZONE, formatRange, formatDate, utcToLocalInput } = require('./time');
const { readCookie, cookieOptions } = require('./security/cookies');
const { publicOrigin } = require('./urls');
const { expiryDate } = require('./retention');

const PRIVACY_NOTICE =
  'Siapa pun yang memiliki tautan dapat melihat agenda ini. ' +
  'Hindari memasukkan data pribadi atau sensitif.';

function renderForm(res, values, errors = []) {
  // Form selalu menampilkan minimal dua baris pilihan waktu.
  const slots = [...values.slots];
  while (slots.length < agendas.MIN_SLOTS) slots.push({ start: '', end: '' });
  // Batas bawah pemilih tanggal: waktu sekarang di zona yang dipilih.
  const timezone = Object.hasOwn(TIMEZONES, values.timezone) ? values.timezone : DEFAULT_TIMEZONE;

  res.render('agenda-form', {
    title: 'Buat agenda',
    values: { ...values, slots },
    minDateTime: utcToLocalInput(new Date(), timezone),
    errors,
    privacyNotice: PRIVACY_NOTICE,
    kinds: agendas.KINDS,
    timezones: TIMEZONES,
    limits: agendas.LIMITS,
    maxSlots: agendas.MAX_SLOTS,
  });
}

function findCurrentParticipant(req, agenda) {
  return participants.findParticipant(agenda.id, readCookie(req, participants.COOKIE));
}

function renderAgenda(req, res, agenda, { voteValues, voteErrors = [] } = {}) {
  const participant = findCurrentParticipant(req, agenda);
  const optionIds = votes.participantOptionIds(participant);
  const voters = votes.tallyVotes(agenda);
  const topCount = Math.max(0, ...[...voters.values()].map((names) => names.length));

  // noindex hanya meminta mesin pencari tidak mengindeks; ini bukan kontrol
  // akses. Siapa pun yang tahu tautannya tetap bisa membuka halaman ini.
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const lastEnd = agenda.timeOptions.reduce(
    (max, option) => (option.ends_at > max ? option.ends_at : max),
    agenda.created_at
  );
  const { retentionDays } = req.app.get('config');
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
    participantCount: participants.participantCount(agenda.id),
    participant,
    voteValues: voteValues || {
      name: participant ? participant.name : '',
      optionIds,
    },
    voteErrors,
    nameMax: participants.NAME_MAX,
    shareUrl: `${publicOrigin(req)}/a/${agenda.slug}`,
    justCreated: req.query.baru === '1',
    voteSaved: req.query.tersimpan === '1',
    privacyNotice: PRIVACY_NOTICE,
    expiresLabel: formatDate(expiryDate(lastEnd, retentionDays), agenda.timezone),
  });
}

// Membuat router aplikasi. `limiters` berasal dari createLimiters() agar
// setiap instance aplikasi punya penghitung rate limit sendiri.
function createRouter(limiters) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.render('home', { title: 'Beranda' });
  });

  router.get('/health', (req, res) => {
    // Sengaja minim: tidak membocorkan uptime, versi, atau detail server.
    res.json({ status: 'ok' });
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

  router.post('/agenda', limiters.create, (req, res) => {
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

  router.post('/a/:slug/suara', limiters.participate, (req, res, next) => {
    const agenda = agendas.findAgendaBySlug(req.params.slug);
    if (!agenda) return next();
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
        voteErrors: [`Agenda ini sudah mencapai batas ${participants.MAX_PARTICIPANTS} peserta.`],
      });
    }

    if (newToken) {
      // Cookie hanya dikirim ke halaman agenda ini dan tidak bisa dibaca
      // JavaScript. SameSite=Lax mencegah situs lain mengubah suara peserta.
      res.cookie(participants.COOKIE, newToken, cookieOptions(req, {
        path: `/a/${agenda.slug}`,
        maxAge: participants.COOKIE_MAX_AGE,
      }));
    }
    res.redirect(303, `/a/${agenda.slug}?tersimpan=1#suara`);
  });

  return router;
}

module.exports = { createRouter };
