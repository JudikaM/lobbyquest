// Perilaku kecil di halaman agenda. Halaman tetap berfungsi tanpa JavaScript;
// skrip ini hanya menambah kenyamanan.
// Fokus, seleksi, dan tombol salin ditangani app.js untuk semua halaman.

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

// ---------- Waktu di zona perangkat ----------

const lobby = document.querySelector('[data-agenda-timezone]');
const agendaZone = lobby?.dataset.agendaTimezone;
const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function zoneName(date, timeZone) {
  const parts = new Intl.DateTimeFormat('id-ID', { timeZone, timeZoneName: 'short' }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value || timeZone;
}

function formatRangeIn(start, end, timeZone) {
  const day = new Intl.DateTimeFormat('id-ID', { timeZone, weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Intl.DateTimeFormat('id-ID', { timeZone, hour: '2-digit', minute: '2-digit' });
  const zone = zoneName(start, timeZone);
  if (day.format(start) === day.format(end)) {
    return `${day.format(start)}, ${time.format(start)}–${time.format(end)} ${zone}`;
  }
  return `${day.format(start)}, ${time.format(start)} – ${day.format(end)}, ${time.format(end)} ${zone}`;
}

// Jam dinding di dua zona sama → tidak perlu keterangan tambahan.
function sameWallClock(date, zoneA, zoneB) {
  const format = (timeZone) => new Intl.DateTimeFormat('en-US', {
    timeZone, day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).format(date);
  return format(zoneA) === format(zoneB);
}

const timed = [...document.querySelectorAll('[data-local-time]')];
if (agendaZone && viewerZone && timed.length) {
  let added = false;
  for (const element of timed) {
    const start = new Date(element.dataset.start);
    const end = new Date(element.dataset.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (sameWallClock(start, agendaZone, viewerZone)) continue;
    const note = document.createElement('span');
    note.className = 'local-time';
    note.textContent = `Di perangkatmu: ${formatRangeIn(start, end, viewerZone)}`;
    element.append(note);
    added = true;
  }
  const zoneNote = document.querySelector('[data-local-zone-note]');
  if (added && zoneNote) {
    zoneNote.textContent = ' Jam sesuai zona waktu perangkatmu ditampilkan di bawah tiap pilihan.';
  }
}

// ---------- Hitung mundur ke waktu final ----------

function describeDuration(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days) return hours ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours) return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
  return `${rest} menit`;
}

const countdown = document.querySelector('[data-countdown]');
if (countdown) {
  const start = new Date(countdown.dataset.start).getTime();
  const end = new Date(countdown.dataset.end).getTime();
  const update = () => {
    const now = Date.now();
    if (now < start) {
      countdown.textContent = `Mulai dalam ${describeDuration(start - now)}`;
    } else if (now < end) {
      countdown.textContent = 'Sedang berlangsung. Gas!';
      countdown.classList.add('is-live');
    } else {
      countdown.textContent = 'Sudah selesai.';
    }
  };
  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    update();
    countdown.hidden = false;
    setInterval(update, 30_000);
  }
}
