const { rateLimit } = require('express-rate-limit');

const MINUTE = 60 * 1000;

// Batas bawaan per alamat IP. Penghitung hanya disimpan di memori proses
// selama jendela waktunya berjalan, tidak pernah ditulis ke database.
const DEFAULT_LIMITS = {
  create: { windowMs: 60 * MINUTE, limit: 10 },
  participate: { windowMs: 10 * MINUTE, limit: 30 },
  manage: { windowMs: 10 * MINUTE, limit: 20 },
};

const MESSAGES = {
  create: 'Terlalu banyak agenda dibuat dari jaringan ini. Coba lagi nanti.',
  participate: 'Terlalu banyak percobaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.',
  manage: 'Terlalu banyak aksi pengelola dalam waktu singkat. Tunggu sebentar lalu coba lagi.',
};

function createLimiters(overrides = {}) {
  const limiters = {};
  for (const [name, defaults] of Object.entries(DEFAULT_LIMITS)) {
    const options = { ...defaults, ...overrides[name] };
    limiters[name] = rateLimit({
      windowMs: options.windowMs,
      limit: options.limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).render('error', {
          title: 'Pelan-pelan dulu',
          message: MESSAGES[name],
        });
      },
    });
  }
  return limiters;
}

module.exports = { createLimiters, DEFAULT_LIMITS };
