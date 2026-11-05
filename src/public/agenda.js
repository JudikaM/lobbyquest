// Perilaku kecil di halaman agenda. Halaman tetap berfungsi tanpa JavaScript.
for (const input of document.querySelectorAll('[data-select-on-focus]')) {
  input.addEventListener('focus', () => input.select());
}
