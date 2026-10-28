# LobbyQuest

Web open source untuk membuat janji mabar dan nongkrong bersama teman.

Fitur yang direncanakan untuk MVP:

- Membuat agenda. *(sudah tersedia)*
- Voting pilihan waktu.
- Pembuat agenda menetapkan waktu.
- Peserta mengonfirmasi kehadiran.

## Kebutuhan

- [Node.js](https://nodejs.org/) versi 22 atau lebih baru (disarankan versi LTS terbaru)
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

### Database

Aplikasi memakai SQLite. File database dibuat otomatis di
`data/lobbyquest.db` saat server pertama kali berjalan, dan migrasi di
`src/db/migrations/` dijalankan otomatis. Folder `data/` tidak ikut ke Git.

Untuk mengosongkan database, hentikan server lalu hapus folder `data/`.

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
├── server.js          # setup Express, EJS, file statis, dan penanganan error
├── routes.js          # daftar route aplikasi
├── agendas.js         # validasi, penyimpanan, dan pengambilan agenda
├── time.js            # konversi zona waktu dan format tanggal
├── db/
│   ├── index.js       # koneksi SQLite dan runner migrasi
│   └── migrations/    # file .sql perubahan struktur database
├── views/             # template EJS
│   ├── partials/      # header, footer, dan baris pilihan waktu
│   ├── home.ejs       # beranda
│   ├── agenda-form.ejs # form membuat agenda
│   ├── agenda.ejs     # detail agenda dan tautan berbagi
│   └── error.ejs      # halaman 404 dan error
└── public/            # file statis (CSS, JavaScript form)
data/                  # database SQLite lokal (tidak ikut Git)
```

## Keamanan

- Jangan menulis secret (password, token, kunci API, secret session) langsung
  di kode. Baca dari variabel lingkungan, misalnya `process.env.SESSION_SECRET`.
- File `.env`, database lokal, backup, dan kunci privat sudah diabaikan oleh
  `.gitignore`. Jangan memaksa memasukkannya dengan `git add -f`.
- Jika menemukan celah keamanan, laporkan secara privat lewat
  [GitHub Security Advisories](https://github.com/JudikaM/lobbyquest/security/advisories/new),
  bukan lewat issue publik.

## Catatan desain (belum final)

Catatan ini menjadi pegangan untuk tahap berikutnya:

- **Nama peserta bukan identitas.** Setiap peserta diwakili ID/token peserta,
  sehingga dua orang dengan nama yang sama tetap dibedakan.
- **Akses pengelola diverifikasi di server.** Token rahasia pengelola tidak
  boleh terus dibawa di URL. Setelah diverifikasi sekali, akses disimpan
  dengan cara lain (misalnya cookie), dan setiap aksi pengelola dicek di server.
- **Skema database belum final.** Rancangan tabel dapat berubah selama MVP.
