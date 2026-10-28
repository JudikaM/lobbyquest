# LobbyQuest

Web open source untuk membuat janji mabar dan nongkrong bersama teman.

Fitur yang direncanakan untuk MVP:

- Membuat agenda.
- Voting pilihan waktu.
- Pembuat agenda menetapkan waktu.
- Peserta mengonfirmasi kehadiran.

Saat ini proyek masih di tahap setup dasar.

## Kebutuhan

- [Node.js](https://nodejs.org/) versi 20 atau lebih baru (disarankan versi LTS terbaru)
- npm (sudah termasuk saat memasang Node.js)

Cek versi yang terpasang:

```sh
node --version
npm --version
```

## Instalasi

```sh
git clone <url-repository> lobbyquest
cd lobbyquest
npm install
```

## Menjalankan aplikasi

| Perintah      | Fungsi                                                   |
| ------------- | -------------------------------------------------------- |
| `npm start`   | Menjalankan server biasa.                                |
| `npm run dev` | Menjalankan server dan memuat ulang otomatis saat file berubah. |

Setelah server berjalan, buka <http://localhost:3000>.

Cek status aplikasi di <http://localhost:3000/health>.

### Mengganti port

Port bawaan adalah `3000`. Untuk memakai port lain, atur variabel `PORT`.

macOS / Linux / Git Bash:

```sh
PORT=4000 npm start
```

Windows PowerShell:

```powershell
$env:PORT = 4000
npm start
```

Windows Command Prompt (cmd):

```bat
set PORT=4000
npm start
```

### Catatan untuk Windows PowerShell

Jika muncul galat seperti `npm.ps1 cannot be loaded because running scripts is disabled`,
izinkan skrip untuk pengguna saat ini:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Atau jalankan lewat `npm.cmd`, misalnya `npm.cmd start`.

## Struktur folder

```
src/
├── server.js      # setup Express, EJS, file statis, dan menjalankan server
├── routes.js      # daftar route aplikasi
├── views/         # template EJS
│   ├── partials/  # kerangka halaman (header & footer)
│   └── home.ejs   # halaman beranda
└── public/        # file statis (CSS)
```

## Catatan desain (belum final)

Catatan ini menjadi pegangan untuk tahap berikutnya:

- **Nama peserta bukan identitas.** Setiap peserta diwakili ID/token peserta,
  sehingga dua orang dengan nama yang sama tetap dibedakan.
- **Akses pengelola diverifikasi di server.** Token rahasia pengelola tidak
  boleh terus dibawa di URL. Setelah diverifikasi sekali, akses disimpan
  dengan cara lain (misalnya cookie), dan setiap aksi pengelola dicek di server.
- **Skema database belum final.** Rancangan tabel dapat berubah selama MVP.
