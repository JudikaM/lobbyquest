const crypto = require('node:crypto');
const path = require('node:path');

const DEFAULT_DATABASE_PATH = path.join(__dirname, '..', 'data', 'lobbyquest.db');
const SECRET_MIN_LENGTH = 32;

function integer(env, name, fallback, min, max) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} harus bilangan bulat ${min}–${max}.`);
  }
  return value;
}

// Nilai TRUST_PROXY diteruskan ke pengaturan "trust proxy" Express.
// Angka berarti jumlah proxy di depan aplikasi; teks lain (misalnya
// "loopback") dipakai apa adanya. Kosong berarti tidak memercayai proxy.
function trustProxy(raw) {
  if (raw === undefined || raw === '' || raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

function databasePath(env = process.env) {
  return env.DATABASE_PATH || DEFAULT_DATABASE_PATH;
}

function publicUrl(raw) {
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('PUBLIC_URL harus URL lengkap, misalnya https://lobbyquest.example.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('PUBLIC_URL harus memakai http atau https.');
  }
  return url.origin;
}

// Membaca konfigurasi dari environment variable. Semua nilai sensitif hanya
// berasal dari environment, tidak pernah ditulis di kode.
function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  let appSecret = env.APP_SECRET || '';
  if (appSecret && appSecret.length < SECRET_MIN_LENGTH) {
    throw new Error(`APP_SECRET minimal ${SECRET_MIN_LENGTH} karakter.`);
  }
  if (!appSecret) {
    if (isProduction) {
      throw new Error('APP_SECRET wajib diatur saat NODE_ENV=production.');
    }
    // Di luar production, secret acak per proses sudah cukup. Token CSRF
    // lama otomatis tidak berlaku setelah server dimulai ulang.
    appSecret = crypto.randomBytes(32).toString('base64url');
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port: integer(env, 'PORT', 3000, 1, 65535),
    databasePath: databasePath(env),
    appSecret,
    publicUrl: publicUrl(env.PUBLIC_URL),
    trustProxy: trustProxy(env.TRUST_PROXY),
    retentionDays: integer(env, 'RETENTION_DAYS', 30, 1, 3650),
  });
}

module.exports = { loadConfig, databasePath };
