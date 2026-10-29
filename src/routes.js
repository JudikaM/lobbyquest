const express = require('express');
const agendas = require('./agendas');
const { TIMEZONES, DEFAULT_TIMEZONE, formatRange } = require('./time');

const router = express.Router();

const PRIVACY_NOTICE =
  'Siapa pun yang memiliki tautan dapat melihat agenda ini. ' +
  'Hindari memasukkan data pribadi atau sensitif.';

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
  // req.is() bernilai null jika request tidak punya body (diperlakukan
  // sebagai form kosong) dan false jika body memakai format lain.
  if (req.is('application/x-www-form-urlencoded') === false) {
    return res.status(415).render('error', {
      title: 'Format tidak didukung',
      message: 'Kirim agenda melalui form di halaman Buat agenda.',
    });
  }

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
    timeOptions: agenda.timeOptions.map((option) =>
      formatRange(option.starts_at, option.ends_at, agenda.timezone)
    ),
    shareUrl: `${req.protocol}://${req.get('host')}/a/${agenda.slug}`,
    justCreated: req.query.baru === '1',
    privacyNotice: PRIVACY_NOTICE,
  });
});

module.exports = router;
