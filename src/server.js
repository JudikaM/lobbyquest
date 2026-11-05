const { loadConfig } = require('./config');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`Konfigurasi tidak valid: ${error.message}`);
  process.exit(1);
}

const db = require('./db');
const { createApp } = require('./app');

const app = createApp({ config });
const server = app.listen(config.port, () => {
  console.log(`LobbyQuest berjalan di http://localhost:${config.port}`);
});

// Menutup koneksi dengan rapi saat proses dihentikan (Ctrl+C, docker stop).
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  // Paksa berhenti jika masih ada koneksi keep-alive yang menggantung.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
