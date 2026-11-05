# Panduan Kontribusi

Terima kasih sudah tertarik membantu LobbyQuest. Kontribusi kecil seperti
memperbaiki typo atau memperjelas teks antarmuka juga sangat berarti.

## Sebelum mulai

- Untuk perubahan besar atau fitur baru, buka issue dulu supaya arah dan
  cakupannya bisa didiskusikan.
- Celah keamanan **jangan** dilaporkan lewat issue. Ikuti
  [SECURITY.md](SECURITY.md).

## Menyiapkan lingkungan

```sh
git clone https://github.com/JudikaM/lobbyquest.git
cd lobbyquest
npm install
npm run dev
```

Butuh Node.js 22 atau lebih baru. Database SQLite lokal dibuat otomatis di
`data/` dan tidak ikut ke Git.

## Alur kerja

1. Fork repository, lalu buat branch dari `main`, misalnya
   `feat/rsvp-reminder` atau `fix/vote-validation`.
2. Buat perubahan kecil dan fokus. Satu pull request sebaiknya membahas satu
   hal.
3. Tambahkan atau perbarui test untuk perilaku yang berubah.
4. Jalankan pemeriksaan berikut sampai bersih:

   ```sh
   npm run lint
   npm test
   npm audit
   ```

5. Buka pull request dan isi template yang tersedia.

## Gaya commit

Gunakan [Conventional Commits](https://www.conventionalcommits.org/) dalam
bahasa Inggris, kalimat perintah, dan ringkas:

```
feat(rsvp): add attendance confirmation for participants
fix(agenda): reject time options in the past
security(csrf): protect all form posts
docs(readme): document configuration
```

Tipe yang dipakai: `feat`, `fix`, `refactor`, `style`, `docs`, `test`,
`chore`, `perf`, `ci`, `security`. Satu commit berisi satu perubahan logis,
dan aplikasi harus tetap bisa jalan serta test harus lulus di setiap commit.

## Pedoman kode

- **SQL**: selalu prepared statement dengan parameter. Jangan menyambung
  string ke query.
- **Template**: pakai `<%= %>` (escaped) untuk semua data. `<%- %>` hanya untuk
  `include` partial internal.
- **Input**: validasi dan batasi panjang di server. Validasi di browser hanya
  untuk kenyamanan.
- **CSP**: jangan menambah inline script, atribut `on*=`, atau atribut
  `style=`. Taruh JavaScript di `src/public/*.js` (dimuat sebagai modul) dan
  gaya di `style.css`.
- **Privasi**: jangan menambah analytics, pelacak, CDN, atau layanan pihak
  ketiga yang menerima data pengguna. Jangan menyimpan IP, user-agent, email,
  atau data identitas peserta.
- **Secret**: semua konfigurasi sensitif dibaca dari environment variable.
  Jangan pernah meng-commit `.env`, database, log, atau kunci privat.
- **Database**: perubahan skema ditulis sebagai file migrasi baru di
  `src/db/migrations/` dengan nomor berikutnya. Jangan mengubah migrasi yang
  sudah dirilis.
- **Bahasa antarmuka**: bahasa Indonesia yang natural dan sapaan "kamu".
- **Dependensi**: tambahkan hanya jika benar-benar perlu, terawat, dan lolos
  `npm audit`.

## Test

Test memakai `node:test` bawaan Node.js. Test integrasi menjalankan aplikasi
sungguhan di port acak dengan database di memori, lewat klien kecil di
`test/helpers.js` yang menyimpan cookie dan token CSRF seperti browser.

```sh
npm test                       # semua test
node --test test/rsvp.test.js  # satu file
```

## Lisensi

Dengan berkontribusi, kamu setuju kontribusimu dirilis di bawah
[lisensi MIT](LICENSE) proyek ini.
