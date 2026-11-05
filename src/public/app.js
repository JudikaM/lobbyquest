// Peningkatan progresif untuk semua halaman. Setiap fitur di sini opsional:
// tanpa JavaScript, halaman tetap bisa dipakai sepenuhnya.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Fokus & seleksi ----------

for (const input of document.querySelectorAll('[data-select-on-focus]')) {
  input.addEventListener('focus', () => input.select());
}

document.querySelector('[data-focus-on-load]')?.focus();

// ---------- Toast ----------

const FLASH_PARAMS = ['baru', 'tersimpan', 'hadir', 'ditetapkan', 'kelola', 'keluar', 'dihapus'];
const TOAST_MS = 6000;

// Parameter notifikasi dihapus dari alamat agar tidak muncul lagi saat
// halaman dimuat ulang.
function cleanFlashParams() {
  const url = new URL(window.location.href);
  let changed = false;
  for (const name of FLASH_PARAMS) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  }
  if (changed) history.replaceState(history.state, '', url);
}

function dismissToast(toast) {
  if (toast.dataset.state === 'closing') return;
  toast.dataset.state = 'closing';
  const remove = () => toast.remove();
  if (reducedMotion()) remove();
  else toast.addEventListener('animationend', remove, { once: true });
}

function setupToast(toast) {
  let remaining = TOAST_MS;
  let startedAt = 0;
  let timer = 0;
  const start = () => {
    startedAt = Date.now();
    timer = window.setTimeout(() => dismissToast(toast), remaining);
  };
  const pause = () => {
    window.clearTimeout(timer);
    remaining = Math.max(1500, remaining - (Date.now() - startedAt));
  };
  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', start);
  toast.addEventListener('focusin', pause);
  toast.addEventListener('focusout', start);
  toast.querySelector('[data-toast-close]')?.addEventListener('click', (event) => {
    event.preventDefault();
    dismissToast(toast);
  });
  start();
}

const toaster = document.querySelector('[data-toaster]');
for (const toast of document.querySelectorAll('[data-toast]')) {
  setupToast(toast);
  // Isi live region dimasukkan ulang agar diumumkan pembaca layar.
  const body = toast.querySelector('[data-toast-body]');
  if (body) {
    const nodes = [...body.childNodes];
    body.replaceChildren();
    window.setTimeout(() => body.replaceChildren(...nodes), 120);
  }
}
if (document.querySelector('[data-toast]')) cleanFlashParams();

// Toast dari JavaScript (misalnya setelah menyalin tautan).
export function showToast(title, description = '', variant = 'success') {
  const template = document.querySelector(`#toast-template-${variant}`);
  if (!toaster || !template) return;
  const toast = template.content.firstElementChild.cloneNode(true);
  toast.querySelector('[data-toast-title]').textContent = title;
  const desc = toast.querySelector('[data-toast-description]');
  if (description) desc.textContent = description;
  else desc.remove();
  toaster.append(toast);
  setupToast(toast);
}

// ---------- Salin ke clipboard ----------

for (const button of document.querySelectorAll('[data-copy]')) {
  const target = document.querySelector(button.dataset.copy);
  if (!target || !navigator.clipboard) continue;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(target.value || target.textContent.trim());
      button.dataset.copied = 'true';
      window.setTimeout(() => delete button.dataset.copied, 2000);
      showToast(button.dataset.copyMessage || 'Tersalin', button.dataset.copyHint || '');
    } catch {
      target.focus();
      if (typeof target.select === 'function') target.select();
      showToast('Tidak bisa menyalin otomatis', 'Teks sudah dipilih; salin secara manual.', 'error');
    }
  });
}

// ---------- Dialog dari <details data-dialog> ----------
// Tanpa JavaScript, <details> terbuka di tempat. Dengan JavaScript, isinya
// dipindahkan ke <dialog> modal (fokus terkunci, Esc menutup).

let dialogCount = 0;
for (const details of document.querySelectorAll('details[data-dialog]')) {
  const summary = details.querySelector(':scope > summary');
  const body = details.querySelector(':scope > [data-dialog-body]');
  if (!summary || !body || typeof HTMLDialogElement !== 'function') continue;

  dialogCount += 1;
  const dialog = document.createElement('dialog');
  dialog.className = details.dataset.dialog === 'sheet' ? 'dialog dialog-sheet' : 'dialog';
  const title = body.querySelector('[data-dialog-title]');
  if (title) {
    title.id ||= `dialog-title-${dialogCount}`;
    dialog.setAttribute('aria-labelledby', title.id);
  }
  dialog.append(body);
  document.body.append(dialog);
  details.open = false;

  summary.setAttribute('aria-haspopup', 'dialog');
  summary.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => summary.focus());
  for (const close of body.querySelectorAll('[data-dialog-close]')) {
    close.hidden = false;
    close.addEventListener('click', () => dialog.close());
  }
}

// ---------- Tabs ----------
// Tanpa JavaScript, setiap panel tampil berurutan dengan judulnya sendiri.

let tabsCount = 0;
for (const tabs of document.querySelectorAll('[data-tabs]')) {
  const panels = [...tabs.querySelectorAll(':scope > [data-tab-label]')];
  const list = tabs.querySelector(':scope > [data-tabs-list]');
  if (!list || panels.length < 2) continue;

  tabsCount += 1;
  const buttons = panels.map((panel, index) => {
    const id = `tabs-${tabsCount}-${index}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.id = `${id}-tab`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id || `${id}-panel`);
    button.textContent = panel.dataset.tabLabel;
    panel.id ||= `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    list.append(button);
    return button;
  });

  const select = (index, focus = false) => {
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) buttons[index].focus();
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', (event) => {
      const last = buttons.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
  });

  list.setAttribute('role', 'tablist');
  list.hidden = false;
  tabs.classList.add('is-enhanced');
  const initial = Math.max(0, panels.findIndex((panel) => panel.hasAttribute('data-tab-active')));
  select(initial);
}

// ---------- Tooltip: Esc menyembunyikan (WCAG 1.4.13) ----------

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const el of document.querySelectorAll('[data-tooltip]:hover, [data-tooltip]:focus-visible')) {
    el.setAttribute('data-tooltip-hidden', '');
  }
});

for (const el of document.querySelectorAll('[data-tooltip]')) {
  const reset = () => el.removeAttribute('data-tooltip-hidden');
  el.addEventListener('mouseleave', reset);
  el.addEventListener('blur', reset);
}
