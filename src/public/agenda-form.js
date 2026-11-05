// Menambah dan menghapus baris pilihan waktu. Tanpa JavaScript, form tetap
// bisa dipakai dengan baris bawaan.
const slots = document.querySelector('[data-slots]');
const template = document.querySelector('#slot-template');
const addButton = document.querySelector('[data-add-slot]');
const timezoneSelect = document.querySelector('[data-timezone-select]');
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

// Nilai "YYYY-MM-DDTHH:mm" untuk saat ini di zona waktu tertentu, dipakai
// sebagai batas bawah pemilih tanggal. Server tetap memvalidasi ulang.
function nowInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(Date.now() + 60_000));
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function updateMin() {
  if (!timezoneSelect) return;
  const min = nowInZone(timezoneSelect.value);
  for (const input of document.querySelectorAll('input[type="datetime-local"]')) input.min = min;
}

addButton.addEventListener('click', () => {
  slots.append(template.content.cloneNode(true));
  updateMin();
  refresh();
});

slots.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-slot]');
  if (!button) return;
  button.closest('[data-slot]').remove();
  refresh();
});

// Form baru: pilih otomatis zona waktu perangkat jika termasuk WIB/WITA/WIT.
// Form yang dikirim ulang karena error tetap memakai pilihan pengguna.
if (timezoneSelect) {
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fresh = !document.querySelector('[data-focus-on-load]');
  const supported = [...timezoneSelect.options].some((option) => option.value === deviceZone);
  if (fresh && supported) timezoneSelect.value = deviceZone;
  timezoneSelect.addEventListener('change', updateMin);
  updateMin();
}

refresh();

