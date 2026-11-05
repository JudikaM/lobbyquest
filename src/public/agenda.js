// Perilaku kecil di halaman agenda. Halaman tetap berfungsi tanpa JavaScript;
// skrip ini hanya menambah kenyamanan.
for (const input of document.querySelectorAll('[data-select-on-focus]')) {
  input.addEventListener('focus', () => input.select());
}

// Pesan error form difokuskan agar langsung terbaca pembaca layar dan
// terlihat di layar kecil.
document.querySelector('[data-focus-on-load]')?.focus();

// Tombol salin tautan.
const copyStatus = document.querySelector('[data-copy-status]');
for (const button of document.querySelectorAll('[data-copy]')) {
  const input = document.querySelector(button.dataset.copy);
  if (!input || !navigator.clipboard) continue;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      if (copyStatus) copyStatus.textContent = 'Tautan tersalin. Tempel di grup chat-mu.';
    } catch {
      input.focus();
      input.select();
      if (copyStatus) copyStatus.textContent = 'Tidak bisa menyalin otomatis. Tautan sudah dipilih, salin secara manual.';
    }
  });
}

// Lembar berbagi bawaan perangkat (Android/iOS), jika tersedia.
const shareButton = document.querySelector('[data-native-share]');
if (shareButton && typeof navigator.share === 'function') {
  shareButton.hidden = false;
  shareButton.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: shareButton.dataset.shareTitle,
        text: shareButton.dataset.shareText,
        url: shareButton.dataset.shareUrl,
      });
    } catch {
      // Dibatalkan pengguna atau tidak didukung: tidak perlu tindakan.
    }
  });
}
