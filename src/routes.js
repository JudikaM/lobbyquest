const express = require('express');
const agendas = require('./agendas');
const votes = require('./votes');
const participants = require('./participants');
const managers = require('./managers');
const rsvp = require('./rsvp');
const { initial, avatarClass, fillClass } = require('./presenters');
const { shareText, shareLinks } = require('./share');
const calendar = require('./calendar');
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

// Token pengelola dari cookie, hanya jika valid untuk agenda ini.
function managerToken(req, agenda) {
  const token = readCookie(req, managers.COOKIE);
  return managers.verifyToken(agenda.id, token) ? token : null;
}

function setManagerCookie(req, res, slug, token) {
  res.cookie(managers.COOKIE, token, cookieOptions(req, {
    path: `/a/${slug}`,
    maxAge: managers.COOKIE_MAX_AGE,
  }));
}

function requireManager(req, res, next) {
  if (managerToken(req, req.agenda)) return next();
  return res.status(403).render('error', {
    title: 'Khusus pengelola',
    message: 'Aksi ini hanya bisa dilakukan oleh pembuat agenda dari browser yang dipakai saat membuat agenda, atau setelah memasukkan kode pengelola.',
  });
}

function renderManageLogin(res, agenda, { error } = {}) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.render('manage-login', { title: `Kelola ${agenda.title}`, noindex: true, agenda, error });
}

function setParticipantCookie(req, res, slug, token) {
  // Cookie hanya dikirim ke halaman agenda ini dan tidak bisa dibaca
  // JavaScript. SameSite=Lax mencegah situs lain mengubah suara peserta.
  res.cookie(participants.COOKIE, token, cookieOptions(req, {
    path: `/a/${slug}`,
    maxAge: participants.COOKIE_MAX_AGE,
  }));
}

function participantLimitMessage() {
  return `Agenda ini sudah mencapai batas ${participants.MAX_PARTICIPANTS} peserta.`;
}

function calendarEvent(agenda, url) {
  return {
    slug: agenda.slug,
    title: agenda.title,
    description: agenda.description,
    location: agenda.location,
    url,
    startsAt: agenda.finalOption.starts_at,
    endsAt: agenda.finalOption.ends_at,
  };
}

function renderAgenda(req, res, agenda, {
  voteValues, voteErrors = [], manageErrors = [], rsvpValues, rsvpErrors = [],
} = {}) {
  const participant = findCurrentParticipant(req, agenda);
  const manager = managerToken(req, agenda);
  const origin = publicOrigin(req);
  const optionIds = votes.participantOptionIds(participant);
  const voters = votes.tallyVotes(agenda);
  const members = participants.listParticipants(agenda.id);
  const count = members.length;
  const topCount = Math.max(0, ...[...voters.values()].map((names) => names.length));

  // noindex hanya meminta mesin pencari tidak mengindeks; ini bukan kontrol
  // akses. Siapa pun yang tahu tautannya tetap bisa membuka halaman ini.
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const lastEnd = agenda.timeOptions.reduce(
    (max, option) => (option.ends_at > max ? option.ends_at : max),
    agenda.created_at
  );
  const { retentionDays } = req.app.get('config');
  const finalLabel = agenda.finalOption
    ? formatRange(agenda.finalOption.starts_at, agenda.finalOption.ends_at, agenda.timezone)
    : null;
  const shareUrl = `${origin}/a/${agenda.slug}`;
  const text = shareText(agenda, { finalLabel });
  res.render('agenda', {
    title: agenda.title,
    noindex: true,
    agenda,
    kindLabel: agendas.KINDS[agenda.kind],
    timezoneLabel: `${TIMEZONES[agenda.timezone]} (${agenda.timezone})`,
    status: agenda.status,
    statusLabel: agendas.STATUS_LABELS[agenda.status],
    finalLabel,
    timeOptions: agenda.timeOptions.map((option) => {
      const names = voters.get(option.id);
      return {
        id: option.id,
        startsAt: option.starts_at,
        endsAt: option.ends_at,
        fill: fillClass(names.length, count),
        label: formatRange(option.starts_at, option.ends_at, agenda.timezone),
        voters: names,
        isTop: topCount > 0 && names.length === topCount,
        isFinal: option.id === agenda.final_option_id,
        canFinalize: Boolean(agendas.finalizableOption(agenda, String(option.id))),
      };
    }),
    participantCount: count,
    party: members.map((member) => ({
      name: member.name,
      rsvp: member.rsvp,
      initial: initial(member.name),
      avatar: avatarClass(member.id),
      isYou: Boolean(participant && participant.id === member.id),
    })),
    participant,
    voteValues: voteValues || {
      name: participant ? participant.name : '',
      optionIds,
    },
    voteErrors,
    nameMax: participants.NAME_MAX,
    shareUrl,
    calendarUrl: agenda.finalOption ? `/a/${agenda.slug}/kalender.ics` : null,
    googleCalendarUrl: agenda.finalOption
      ? calendar.googleCalendarUrl(calendarEvent(agenda, shareUrl))
      : null,
    shareText: text,
    shareLinks: shareLinks(shareUrl, text),
    isManager: Boolean(manager),
    // Kode ada di fragment (#) sehingga tidak ikut terkirim ke server saat
    // tautan dibuka; halaman /kelola mengirimkannya lewat POST.
    managerUrl: manager ? `${origin}/a/${agenda.slug}/kelola#kode=${manager}` : null,
    managerCode: manager,
    managerWelcome: req.query.kelola === '1',
    finalSaved: req.query.ditetapkan === '1',
    manageErrors,
    rsvpLabels: rsvp.RSVP_LABELS,
    rsvpSummary: rsvp.rsvpSummary(agenda.id),
    rsvpValues: rsvpValues || {
      name: participant ? participant.name : '',
      status: participant ? participant.rsvp || '' : '',
    },
    rsvpErrors,
    rsvpSaved: req.query.hadir === '1',
    leftAgenda: req.query.keluar === '1',
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
    res.render('home', { title: 'Beranda', deleted: req.query.dihapus === '1' });
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

    const { slug, managerToken: token } = agendas.createAgenda(agenda);
    // Browser pembuat langsung menjadi pengelola tanpa token di URL.
    setManagerCookie(req, res, slug, token);
    res.redirect(303, `/a/${slug}?baru=1`);
  });

  // Semua route /a/:slug memuat agendanya lebih dulu; slug yang tidak ada
  // diteruskan ke handler 404.
  router.param('slug', (req, res, next, slug) => {
    const agenda = agendas.findAgendaBySlug(slug);
    if (!agenda) return next('route');
    req.agenda = agenda;
    return next();
  });

  router.get('/a/:slug', (req, res) => {
    renderAgenda(req, res, req.agenda);
  });

  // File kalender hanya tersedia setelah waktu final ditetapkan.
  router.get('/a/:slug/kalender.ics', (req, res, next) => {
    const { agenda } = req;
    if (!agenda.finalOption) return next();
    const ics = calendar.buildIcs(calendarEvent(agenda, `${publicOrigin(req)}/a/${agenda.slug}`));
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="lobbyquest-agenda.ics"');
    res.send(ics);
  });

  router.get('/a/:slug/kelola', (req, res) => {
    if (managerToken(req, req.agenda)) return res.redirect(303, `/a/${req.agenda.slug}#kelola`);
    renderManageLogin(res, req.agenda);
  });

  router.post('/a/:slug/kelola', limiters.manage, (req, res) => {
    const { agenda } = req;
    const code = typeof req.body.kode === 'string' ? req.body.kode.trim() : '';
    if (!managers.verifyToken(agenda.id, code)) {
      res.status(403);
      return renderManageLogin(res, agenda, { error: 'Kode pengelola tidak cocok.' });
    }
    setManagerCookie(req, res, agenda.slug, code);
    res.redirect(303, `/a/${agenda.slug}?kelola=1#kelola`);
  });

  router.post('/a/:slug/kelola/keluar', limiters.manage, requireManager, (req, res) => {
    res.clearCookie(managers.COOKIE, cookieOptions(req, { path: `/a/${req.agenda.slug}` }));
    res.redirect(303, `/a/${req.agenda.slug}`);
  });

  router.post('/a/:slug/tetapkan', limiters.manage, requireManager, (req, res) => {
    const { agenda } = req;
    const option = agendas.finalizableOption(agenda, req.body.option);
    if (agenda.status === 'done' || agenda.status === 'expired' || !option) {
      res.status(422);
      return renderAgenda(req, res, agenda, {
        manageErrors: ['Pilih salah satu pilihan waktu yang belum dimulai.'],
      });
    }
    agendas.setFinalOption(agenda, option.id);
    res.redirect(303, `/a/${agenda.slug}?ditetapkan=1#status`);
  });

  router.post('/a/:slug/buka-voting', limiters.manage, requireManager, (req, res) => {
    const { agenda } = req;
    if (agenda.status !== 'scheduled') {
      res.status(409);
      return renderAgenda(req, res, agenda, {
        manageErrors: ['Voting hanya bisa dibuka lagi sebelum agenda selesai.'],
      });
    }
    agendas.setFinalOption(agenda, null);
    res.redirect(303, `/a/${agenda.slug}#suara`);
  });

  router.post('/a/:slug/hapus', limiters.manage, requireManager, (req, res) => {
    const { agenda } = req;
    if (req.body.konfirmasi !== 'ya') {
      res.status(422);
      return renderAgenda(req, res, agenda, {
        manageErrors: ['Centang konfirmasi untuk menghapus agenda.'],
      });
    }
    agendas.deleteAgenda(agenda);
    const scope = cookieOptions(req, { path: `/a/${agenda.slug}` });
    res.clearCookie(managers.COOKIE, scope);
    res.clearCookie(participants.COOKIE, scope);
    res.redirect(303, '/?dihapus=1');
  });

  router.post('/a/:slug/suara', limiters.participate, (req, res) => {
    const { agenda } = req;
    if (agenda.status !== 'voting') {
      res.status(409);
      return renderAgenda(req, res, agenda, {
        voteErrors: ['Voting sudah ditutup untuk agenda ini.'],
      });
    }
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
        voteErrors: [participantLimitMessage()],
      });
    }

    if (newToken) setParticipantCookie(req, res, agenda.slug, newToken);
    res.redirect(303, `/a/${agenda.slug}?tersimpan=1#suara`);
  });

  // Peserta bisa menghapus nama, suara, dan konfirmasinya sendiri.
  router.post('/a/:slug/keluar', limiters.participate, (req, res) => {
    const { agenda } = req;
    const participant = findCurrentParticipant(req, agenda);
    if (participant) participants.deleteParticipant(participant);
    res.clearCookie(participants.COOKIE, cookieOptions(req, { path: `/a/${agenda.slug}` }));
    res.redirect(303, `/a/${agenda.slug}?keluar=1`);
  });

  router.post('/a/:slug/hadir', limiters.participate, (req, res) => {
    const { agenda } = req;
    if (agenda.status !== 'scheduled') {
      res.status(409);
      return renderAgenda(req, res, agenda, {
        rsvpErrors: ['Konfirmasi kehadiran hanya dibuka setelah waktu final ditetapkan dan sebelum agenda selesai.'],
      });
    }

    const { values, errors } = rsvp.validateRsvp(req.body);
    if (errors.length) {
      res.status(422);
      return renderAgenda(req, res, agenda, { rsvpValues: values, rsvpErrors: errors });
    }

    let newToken;
    try {
      newToken = rsvp.saveRsvp(agenda, findCurrentParticipant(req, agenda), values);
    } catch (error) {
      if (error.code !== 'PARTICIPANT_LIMIT') throw error;
      res.status(409);
      return renderAgenda(req, res, agenda, {
        rsvpValues: values,
        rsvpErrors: [participantLimitMessage()],
      });
    }

    if (newToken) setParticipantCookie(req, res, agenda.slug, newToken);
    res.redirect(303, `/a/${agenda.slug}?hadir=1#hadir`);
  });

  return router;
}

module.exports = { createRouter };
