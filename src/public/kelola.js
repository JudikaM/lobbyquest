// Tautan pengelola berbentuk /a/<slug>/kelola#kode=<kode>. Fragment (#)
// tidak pernah dikirim ke server, jadi kode dibaca di sini, dihapus dari
// alamat, lalu dikirim lewat POST bersama token CSRF.
const form = document.querySelector('[data-manage-login]');
const input = document.querySelector('[data-manage-code]');
const match = /^#kode=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);

if (form && input && match) {
  history.replaceState(null, '', window.location.pathname);
  input.value = match[1];
  form.requestSubmit();
}
