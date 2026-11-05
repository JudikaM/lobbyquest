const db = require('./db');

const DAY = 24 * 60 * 60 * 1000;

// Agenda kedaluwarsa jika waktu selesai terakhirnya (atau waktu dibuat,
// bila tidak punya pilihan waktu) sudah lewat dari batas retensi.
// Peserta, suara, dan pilihan waktu ikut terhapus lewat ON DELETE CASCADE.
const deleteExpired = db.prepare(`
  DELETE FROM agendas WHERE id IN (
    SELECT a.id
    FROM agendas a
    LEFT JOIN time_options t ON t.agenda_id = a.id
    GROUP BY a.id
    HAVING coalesce(max(t.ends_at), a.created_at) < ?
  )
`);

function expiryDate(lastEndsAt, retentionDays) {
  return new Date(new Date(lastEndsAt).getTime() + retentionDays * DAY);
}

// Menghapus agenda kedaluwarsa. Mengembalikan jumlah agenda yang dihapus.
function purgeExpiredAgendas(retentionDays, now = new Date()) {
  const cutoff = new Date(now.getTime() - retentionDays * DAY).toISOString();
  return deleteExpired.run(cutoff).changes;
}

// Menjalankan pembersihan saat start lalu berkala. Timer tidak menahan
// proses tetap hidup.
function schedulePurge(retentionDays, intervalMs = 6 * 60 * 60 * 1000) {
  const run = () => {
    try {
      const removed = purgeExpiredAgendas(retentionDays);
      if (removed) console.log(`Retensi: ${removed} agenda kedaluwarsa dihapus.`);
    } catch (error) {
      console.error('Retensi gagal dijalankan:', error);
    }
  };
  run();
  return setInterval(run, intervalMs).unref();
}

module.exports = { purgeExpiredAgendas, schedulePurge, expiryDate };
