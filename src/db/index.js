const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
const migrationsDir = path.join(__dirname, 'migrations');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'lobbyquest.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Menjalankan file .sql di folder migrations yang belum pernah dijalankan,
// berurutan menurut nama file. Tiap migrasi berjalan dalam satu transaksi.
function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').pluck().all()
  );
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(file, new Date().toISOString());
    })();
    console.log(`Migrasi dijalankan: ${file}`);
  }
}

migrate();

module.exports = db;
