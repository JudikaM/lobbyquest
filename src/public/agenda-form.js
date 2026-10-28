// Menambah dan menghapus baris pilihan waktu. Tanpa JavaScript, form tetap
// bisa dipakai dengan baris bawaan.
const slots = document.querySelector('[data-slots]');
const template = document.querySelector('#slot-template');
const addButton = document.querySelector('[data-add-slot]');
const maxSlots = Number(slots.dataset.max);
const minSlots = 2;

function refresh() {
  const rows = slots.querySelectorAll('[data-slot]');
  rows.forEach((row, i) => {
    row.querySelector('[data-slot-number]').textContent = i + 1;
    row.querySelector('[data-remove-slot]').hidden = rows.length <= minSlots;
  });
  addButton.hidden = rows.length >= maxSlots;
}

addButton.addEventListener('click', () => {
  slots.append(template.content.cloneNode(true));
  refresh();
});

slots.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-slot]');
  if (!button) return;
  button.closest('[data-slot]').remove();
  refresh();
});

refresh();
