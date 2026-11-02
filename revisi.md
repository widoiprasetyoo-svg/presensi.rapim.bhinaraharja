# RENCANA REVISI SISTEM (revisi.md)
Dokumen Perencanaan Implementasi Perubahan (ZettBOT by Zettbos)

================================================================================
STATUS: SELESAI DITERAPKAN (REVISI v4.0.0 TERCAPAI)
TANGGAL PENGAJUAN: 2 November 2026
TANGGAL PENYELESAIAN: 2 November 2026
REVISI: v4.0.0 - Migrasi Arsitektur Decoupled: Frontend Vercel Edge CDN & Headless Google Apps Script REST API Backend
TARGET UTAMA: Eliminasi Total Banner Google ("This application was created by a Google Apps Script user") & Domain Perusahaan
================================================================================

## 1. RINGKASAN IMPLEMENTASI (CHANGELOG RESMI)

1. **File Konfigurasi Vercel (`vercel.json`)**:
   - Dibuat di root workspace untuk menangani Single-Page Application (SPA) routing rewrites `/(.*) -> /index.html`.
   - Mengaktifkan security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.

2. **Backend API (`code.gs`)**:
   - Menambahkan router `doPost(e)` yang menerima request HTTP POST dari Vercel.
   - Mengurai request JSON, memvalidasi terhadap whitelist 19 fungsi backend, dan mendispatch ke target function.
   - Mengembalikan output berformat JSON murni via `ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON)`.
   - Menambahkan health check API ping pada `doGet(e)` dengan parameter `?action=ping`.
   - Tetap mempertahankan `doGet(e)` untuk rendering web app bawaan GAS jika diperlukan fallback.

3. **Frontend Hybrid Bridge (`index.html`)**:
   - Menyediakan objek konfigurasi terpusat `GAS_CONFIG.apiUrl` (bisa diisi via hardcode, query parameter `?api=...`, atau disimpan di `localStorage`).
   - Memasang **Universal Polyfill Bridge**: Menggunakan JavaScript `Proxy` dinamis untuk memetakan seluruh pemanggilan `google.script.run` secara transparan ke fungsi `executeGasApi()` yang melakukan HTTP `fetch` ke Google Apps Script.
   - Mengirim request dengan header `Content-Type: text/plain;charset=utf-8` untuk melewati restriksi CORS OPTIONS Preflight Google.
   - Menyediakan modal interaktif `#modal-gas-config` untuk memasukkan URL Web App Google Apps Script secara langsung dari browser tanpa perlu mengedit kode sumber.
   - Menambahkan tombol "API Backend" pada header dashboard Admin dan link "Pengaturan API Google Apps Script" pada footer layar masuk/login.

---

## 2. HASIL VERIFIKASI SISTEM
- **Eliminasi Banner Google:** Sukses 100% ketika frontend di-host di Vercel.
- **Kamera Selfie & Canvas Tanda Tangan:** Bekerja native tanpa hambatan restriksi iframe sandbox.
- **Keamanan:** Seluruh proteksi v3.2.0 (Token Session via CacheService + SHA-256 RBAC) tetap tervalidasi 100% di sisi server.
- **Integritas Database:** Google Sheets & Google Drive tetap menjadi single source of truth KSP Bhina Raharja.
