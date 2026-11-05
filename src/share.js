// Teks dan tautan berbagi. Tidak ada data yang dikirim ke layanan lain
// sampai pengguna sendiri mengetuk tombol berbagi.
function shareText(agenda, { finalLabel } = {}) {
  if (agenda.status === 'scheduled' && finalLabel) {
    return `${agenda.title}: jadwalnya ${finalLabel}. Konfirmasi kehadiranmu di LobbyQuest:`;
  }
  return `${agenda.title}: pilih waktu yang kamu bisa di LobbyQuest:`;
}

function shareLinks(url, text) {
  const message = `${text} ${url}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}

module.exports = { shareText, shareLinks };
