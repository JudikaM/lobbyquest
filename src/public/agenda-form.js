// Peningkatan form buat agenda. Tanpa JavaScript, form tetap bisa dipakai:
// baris waktu bawaan, validasi di server, dan pesan error per field.
const form = document.querySelector('[data-agenda-form]');
const slots = document.querySelector('[data-slots]');
const template = document.querySelector('#slot-template');
const addButton = document.querySelector('[data-add-slot]');
const timezoneSelect = document.querySelector('[data-timezone-select]');
const maxSlots = Number(slots.dataset.max);
const minSlots = 2;
const DEFAULT_DURATION_HOURS = 2;

const pad = (n) => String(n).padStart(2, '0');

// Bagian tanggal & jam "sekarang" di zona waktu tertentu.
function nowParts(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get('year')), month: Number(get('month')), day: Number(get('day')),
    hour: Number(get('hour')), minute: Number(get('minute')), weekday: weekdays[get('weekday')],
  };
}

// Nilai datetime-local dari komponen "jam dinding"; aritmetika memakai UTC
// supaya penambahan hari/jam tidak terpengaruh zona browser.
function localValue(year, month, day, hour = 0, minute = 0) {
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function addHours(value, hours) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return '';
  return localValue(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]) + hours, Number(m[5]));
}

function nowInZone(timeZone) {
  const n = nowParts(timeZone);
  return localValue(n.year, n.month, n.day, n.hour, n.minute + 1);
}

// ---------- Baris pilihan waktu ----------

function rows() {
  return [...slots.querySelectorAll('[data-slot]')];
}

function refresh() {
  const all = rows();
  all.forEach((row, i) => {
    const n = i + 1;
    row.querySelector('[data-slot-number]').textContent = n;
    row.querySelector('[data-slot-start]').id = `slot-${n}-start`;
    row.querySelector('[data-slot-end]').id = `slot-${n}-end`;
    const remove = row.querySelector('[data-remove-slot]');
    remove.hidden = all.length <= minSlots;
  });
  addButton.hidden = all.length >= maxSlots;
  updatePreview();
}

function updateMin() {
  if (!timezoneSelect) return;
  const min = nowInZone(timezoneSelect.value);
  for (const input of slots.querySelectorAll('input[type="datetime-local"]')) input.min = min;
}

function addRow() {
  if (rows().length >= maxSlots) return null;
  slots.append(template.content.cloneNode(true));
  const row = rows().at(-1);
  updateMin();
  refresh();
  return row;
}

addButton.addEventListener('click', () => {
  const row = addRow();
  row?.querySelector('[data-slot-start]').focus();
});

slots.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-slot]');
  if (!button) return;
  const row = button.closest('[data-slot]');
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  refresh();
  (next?.querySelector('[data-slot-start]') || addButton).focus();
});

// Waktu selesai otomatis = mulai + 2 jam, jika masih kosong atau tidak valid.
slots.addEventListener('change', (event) => {
  const start = event.target.closest('[data-slot-start]');
  if (!start || !start.value) return;
  const end = start.closest('[data-slot]').querySelector('[data-slot-end]');
  if (!end.value || end.value <= start.value) end.value = addHours(start.value, DEFAULT_DURATION_HOURS);
  updatePreview();
});

// ---------- Isi cepat ----------

const presets = document.querySelector('[data-presets]');
const presetStatus = document.querySelector('[data-preset-status]');

function presetValue(kind, timeZone) {
  const n = nowParts(timeZone);
  const daysUntil = (weekday) => (weekday - n.weekday + 7) % 7;
  switch (kind) {
    case 'tonight':
      return n.hour < 18 ? localValue(n.year, n.month, n.day, 19) : null;
    case 'tomorrow':
      return localValue(n.year, n.month, n.day + 1, 19);
    case 'saturday': {
      let days = daysUntil(6);
      if (days === 0 && n.hour >= 18) days = 7;
      return localValue(n.year, n.month, n.day + days, 19);
    }
    case 'sunday': {
      let days = daysUntil(0);
      if (days === 0 && n.hour >= 14) days = 7;
      return localValue(n.year, n.month, n.day + days, 15);
    }
    default:
      return null;
  }
}

function describe(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
  return `${day}, ${m[4]}.${m[5]}`;
}

if (presets && timezoneSelect) {
  presets.hidden = false;
  const tonight = presets.querySelector('[data-preset="tonight"]');
  const syncTonight = () => {
    tonight.hidden = !presetValue('tonight', timezoneSelect.value);
  };
  syncTonight();
  timezoneSelect.addEventListener('change', syncTonight);

  presets.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    const start = presetValue(button.dataset.preset, timezoneSelect.value);
    if (!start) return;
    const taken = rows().some((row) => row.querySelector('[data-slot-start]').value === start);
    if (taken) {
      presetStatus.textContent = `${describe(start)} sudah ada di daftar.`;
      return;
    }
    let row = rows().find((r) => !r.querySelector('[data-slot-start]').value && !r.querySelector('[data-slot-end]').value);
    if (!row) row = addRow();
    if (!row) {
      presetStatus.textContent = `Maksimal ${maxSlots} pilihan waktu.`;
      return;
    }
    row.querySelector('[data-slot-start]').value = start;
    row.querySelector('[data-slot-end]').value = addHours(start, DEFAULT_DURATION_HOURS);
    row.classList.remove('is-filled');
    void row.offsetWidth; // memulai ulang animasi sorotan
    row.classList.add('is-filled');
    presetStatus.textContent = `Ditambahkan: ${describe(start)} (${DEFAULT_DURATION_HOURS} jam).`;
    updatePreview();
  });
}

// ---------- Zona waktu perangkat ----------
// Form baru: pilih otomatis WIB/WITA/WIT sesuai perangkat. Form yang dikirim
// ulang karena error tetap memakai pilihan pengguna.

if (timezoneSelect) {
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fresh = !document.querySelector('#ringkasan-error');
  const supported = [...timezoneSelect.options].some((option) => option.value === deviceZone);
  if (fresh && supported) timezoneSelect.value = deviceZone;
  timezoneSelect.addEventListener('change', () => {
    updateMin();
    updatePreview();
  });
  updateMin();
}

// ---------- Penghitung karakter ----------

for (const counter of document.querySelectorAll('[data-counter-for]')) {
  const input = document.getElementById(counter.dataset.counterFor);
  if (!input) continue;
  const max = Number(input.getAttribute('maxlength'));
  const update = () => {
    counter.textContent = `${input.value.length}/${max}`;
    counter.classList.toggle('is-near', input.value.length > max * 0.9);
  };
  input.addEventListener('input', update);
  update();
}

// ---------- Stepper kuota ----------

const stepper = document.querySelector('[data-stepper]');
if (stepper) {
  const input = stepper.querySelector('input');
  const min = Number(input.min);
  const max = Number(input.max);
  for (const button of stepper.querySelectorAll('[data-step]')) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step);
      const current = Number(input.value) || (step > 0 ? min - 1 : min + 1);
      const next = Math.min(max, Math.max(min, current + step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

// ---------- Pratinjau ----------

function updatePreview() {
  const title = form.querySelector('[name="title"]').value.trim();
  const titleEl = document.querySelector('[data-preview-title]');
  if (titleEl) {
    titleEl.textContent = title || 'Judul agenda';
    titleEl.classList.toggle('is-empty', !title);
  }
  const kind = form.querySelector('[name="kind"]:checked');
  const kindBadge = document.querySelector('[data-preview-kind]');
  if (kindBadge) {
    kindBadge.dataset.kind = kind ? kind.value : '';
    kindBadge.querySelector('[data-preview-kind-label]').textContent = kind
      ? kind.closest('label').querySelector('.kind-card-label').textContent
      : 'Jenis';
  }
  const filled = rows().filter((row) => row.querySelector('[data-slot-start]').value).length;
  const slotsEl = document.querySelector('[data-preview-slots]');
  if (slotsEl) slotsEl.textContent = String(filled);
  const zoneEl = document.querySelector('[data-preview-zone]');
  if (zoneEl && timezoneSelect) zoneEl.textContent = timezoneSelect.selectedOptions[0].textContent.split(' (')[0].trim();
  const capacity = form.querySelector('[name="capacity"]').value;
  const capEl = document.querySelector('[data-preview-capacity]');
  if (capEl) capEl.textContent = capacity ? `Kuota ${capacity}` : 'Kuota bebas';
}

form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);

refresh();
