// Demo interaktif di halaman sistem desain.
import { showToast } from './app.js';

const demo = document.querySelector('[data-demo-toast]');
if (demo) {
  demo.hidden = false;
  demo.addEventListener('click', () => {
    showToast('Ini toast dari JavaScript', 'Menutup sendiri setelah beberapa detik; berhenti saat di-hover.');
  });
}
