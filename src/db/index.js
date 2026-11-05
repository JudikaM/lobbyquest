const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { databasePath } = require('../config');

const migrationsDir = path.join(__dirname, 'migrations');

// ":memory:" dipakai oleh test; selain itu folder database dibuat otomatis.
const file = databasePath();
if (file !== ':memory:') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Menjalankan file .sql di folder migrations yang belum pernah dijalankan,
// berurutan menurut nama file. Tiap migrasi berjalan dalam satu transaksi.
function migrate({ log = true } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').pluck().all()
  );
  const files = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of files) {
    if (applied.has(name)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(name, new Date().toISOString());
    })();
    if (log) console.log(`Migrasi dijalankan: ${name}`);
  }
}

migrate({ log: process.env.NODE_ENV !== 'test' });

module.exports = db;
