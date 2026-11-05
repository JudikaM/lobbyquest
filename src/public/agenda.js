// Perilaku kecil di halaman agenda. Halaman tetap berfungsi tanpa JavaScript.
for (const input of document.querySelectorAll('[data-select-on-focus]')) {
  input.addEventListener('focus', () => input.select());
}

// Pesan error form difokuskan agar langsung terbaca pembaca layar dan
// terlihat di layar kecil.
document.querySelector('[data-focus-on-load]')?.focus();
