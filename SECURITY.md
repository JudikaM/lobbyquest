# Kebijakan Keamanan

## Melaporkan celah keamanan

**Jangan laporkan celah keamanan lewat issue, diskusi, atau pull request
publik.**

Laporkan secara privat melalui
[GitHub Security Advisories](https://github.com/JudikaM/lobbyquest/security/advisories/new)
(tab **Security** → **Report a vulnerability**). Hanya maintainer yang bisa
melihat laporan tersebut.

Sertakan sebisa mungkin:

- jenis celah dan dampaknya (misalnya XSS, CSRF, kebocoran data peserta);
- langkah reproduksi atau proof of concept minimal;
- versi atau commit yang diuji;
- saran perbaikan, jika ada.

Yang bisa kamu harapkan:

- konfirmasi penerimaan laporan secepatnya, biasanya dalam beberapa hari;
- diskusi tentang tingkat keparahan dan rencana perbaikan di advisory yang sama;
- kredit di advisory dan CHANGELOG setelah perbaikan dirilis, kecuali kamu
  ingin tetap anonim.

Mohon beri waktu yang wajar untuk perbaikan sebelum mengungkapkan detailnya ke
publik.

## Cakupan

Termasuk cakupan: kode di repository ini (server, template, skrip browser,
konfigurasi CI).

Di luar cakupan:

- instance LobbyQuest yang di-deploy pihak lain (hubungi pengelolanya);
- serangan yang membutuhkan akses fisik atau perangkat korban yang sudah
  disusupi;
- DoS volumetrik terhadap instance publik;
- laporan otomatis tanpa dampak nyata (misalnya header yang hanya bersifat
  informatif).

## Versi yang didukung

Perbaikan keamanan diterapkan pada branch `main`. Belum ada rilis versi
lama yang dipelihara terpisah.

## Desain keamanan singkat

Ringkasan model akses dan kontrol keamanan (CSP, CSRF, rate limiting, hash
token, retensi data) ada di bagian *Arsitektur* pada [README](README.md).

---

*English summary: please report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/JudikaM/lobbyquest/security/advisories/new),
not through public issues.*
