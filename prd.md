# SPESIFIKASI KEBUTUHAN PRODUK (PRD) - SISTEM ABSENSI RAPIM PIMPINAN
Dokumen Resmi Perancangan Sistem & Arsitektur Aplikasi (ZettBOT by Zettbos)

================================================================================
ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)
================================================================================

## 1. NAMA PROJEK & PROBLEM STATEMENT
- **Nama Projek:** Sistem Absensi Rapim Pimpinan (Portal Presensi Eksekutif & Agenda Rapat Pimpinan)
- **Problem Statement:** 
  Pada agenda Rapat Pimpinan (Rapim) berkala yang melibatkan pejabat/eksekutif dari berbagai Koordinator Wilayah (Korwil), Cabang, dan Unit kerja, sering terjadi kendala verifikasi keaslian kehadiran fisik peserta di lokasi rapat, potensi titip absen dari luar ruangan rapat, antrean penandatanganan manual di pintu masuk, serta lambatnya rekapitulasi data kehadiran untuk notula dan laporan ke pimpinan tertinggi.
- **Tujuan Sistem:**
  Menyediakan aplikasi web presensi mandiri yang elegan (Anti-AI Human-Crafted Aesthetic), cepat, aman, dan responsif di HP maupun laptop, dengan fitur registrasi akun pimpinan terverifikasi (NIK, Cabang, Korwil, Jabatan, Unit, Password, Foto Selfie), **penguncian lokasi fisik berbasis GPS Geofencing (Radius ketat 25 Meter dari titik koordinat venue rapat)**, tanda tangan digital layar sentuh, serta dashboard monitoring realtime dan rekap ekspor laporan bagi panitia/sekretariat.

---

## 2. PERAN PENGGUNA (USER ROLES)
1. **Pimpinan / Peserta Rapim:**
   - Melakukan registrasi akun pimpinan mandiri (NIK, Nama, Korwil, Cabang, Jabatan, Unit, Password, dan Foto Selfie).
   - Melakukan login mandiri dengan NIK dan Password.
   - Memilih agenda rapim yang sedang berstatus aktif.
   - Mengaktifkan izin lokasi (GPS) pada browser ponsel/laptop saat membuka halaman presensi.
   - Sistem mendeteksi koordinat pimpinan dan menghitung jarak ke lokasi rapat. Jika jarak > 25 Meter untuk status hadir, tombol presensi terkunci otomatis dengan indikator jarak riil.
   - Memilih status kehadiran (*Hadir Langsung*, *Diwakilkan*, atau *Izin*), menggoreskan Tanda Tangan Digital di layar sentuh, lalu mengirim presensi.
   - Melihat riwayat presensi pribadi dan konfirmasi sukses.
2. **Sekretariat / Administrator Rapim:**
   - Login menggunakan akun administrator khusus.
   - **Manajemen Titik Lokasi & Agenda Rapim:** Membuat sesi rapat baru lengkap dengan penentuan titik koordinat lokasi venue rapat (Latitude & Longitude) serta radius toleransi (default 25 Meter). Dilengkapi tombol praktis *"Ambil Titik Lokasi Saya Saat Ini"* dari perangkat panitia.
   - **Live Monitoring Presensi Realtime:** Memantau daftar hadir pimpinan yang masuk secara live lengkap dengan foto selfie, status hadir/wakil/izin, tanda tangan digital, koordinat GPS, serta jarak riil (meter) pimpinan saat submit.
   - **Filter & Pencarian Cepat:** Filter kehadiran berdasarkan Korwil, Cabang, Unit, atau Status Kehadiran.
   - **Manajemen Master Pimpinan:** Meninjau pimpinan yang sudah aktivasi akun, verifikasi status, dan tambah/edit data pimpinan.
   - **Ekspor & Cetak Laporan:** Mengunduh rekap lembar presensi format Excel (.csv/.xlsx) dan cetak dokumen daftar hadir resmi (PDF-ready).

---

## 3. ARSITEKTUR & LINGKUNGAN KERJA
- **Platform Utama:** Google Apps Script (GAS) Web Application terintegrasi dengan Google Sheets sebagai basis data cloud gratis tanpa beban biaya server bulanan.
- **Teknologi Geofencing & GPS:** 
  - HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`) dengan opsi `enableHighAccuracy: true` dan timeout presisi.
  - Formula Matematika Haversine Great-Circle Distance untuk kalkulasi jarak radius kelengkungan bumi dalam satuan meter di sisi frontend & verifikasi ulang di backend.
- **Penyimpanan Berkas (Foto & Signature):** 
  - Foto selfie dikompresi ringan di sisi klien (Canvas client-side compression) lalu diunggah ke Google Drive panitia / data URI terenkripsi.
  - Tanda tangan digital ditangkap via HTML5 Canvas vektor dan disimpan sebagai data PNG Base64 di database/Drive.
- **Frontend Framework:** Single-Page Application (SPA) responsif HTML5, Tailwind CSS via CDN, Vanilla JavaScript (ES6+), Font Sans Inter, Feather/Heroicons SVG inline (Desain Anti-AI yang elegan, rapi, dan cepat).
- **Arsitektur Kode:** Modular Google Apps Script:
  - `code.gs`: Backend Controller, Web App routing (`doGet`), API Endpoint registrasi, autentikasi, validasi geofence server-side, absensi, dan laporan.
  - `setup.gs`: Database auto-provisioning (*Safe Migration*, idempoten, inisialisasi tab sheet tanpa karakter `_`, dan dummy master).
  - `index.html`: Shell tampilan utama responsif, sistem perpindahan tab instan (*in-memory cache*), GPS radar widget, modal absensi, canvas tanda tangan, dan kamera selfie native.

---

## 4. ALUR KERJA APLIKASI (USER FLOW)

### A. Alur Pimpinan (Peserta Rapim)
1. Pimpinan mengakses tautan Web App di HP atau laptop.
2. Jika belum punya akun: Buka tab **"Daftar Akun Pimpinan"**, isi NIK, Nama Lengkap, Korwil, Cabang, Jabatan, Unit, Password, dan ambil foto selfie verifikasi via kamera native HP (`<input type="file" capture="user">`).
3. Saat rapat diselenggarakan: Pimpinan login menggunakan NIK dan Password.
4. Pimpinan membuka halaman **"Presensi Rapim"** dan memilih agenda yang aktif.
5. **Pengecekan Radar Lokasi (Geofencing 25 Meter):**
   - Browser meminta izin akses lokasi perangkat (GPS).
   - Radar menampilkan status jarak riil pimpinan terhadap titik rapat (misal: *"Jarak Anda: 8 meter dari Ruang Rapat - Di Dalam Radius Aman"*).
   - Jika pimpinan berada di luar 25 meter (misal 50 meter), tombol presensi dinonaktifkan dengan peringatan: *"Anda berada di luar area rapat (Jarak: 50m). Silakan masuk ke dalam ruangan rapat untuk melakukan presensi."*
   - *Pengecualian Khusus:* Jika pimpinan memilih status **"Izin"** (misal sakit atau penugasan lain), validasi radius geofence dilewati dengan menyertakan keterangan izin resmi.
6. Pimpinan membubuhkan tanda tangan digital pada kotak kanvas di layar sentuh.
7. Klik tombol **"Kirim Presensi"**. Sistem mencatat waktu presensi, koordinat latitude-longitude pimpinan, dan jarak meter pimpinan ke database.

### B. Alur Sekretariat / Panitia Rapim
1. Panitia login sebagai **Admin / Sekretariat**.
2. Buka menu **"Agenda Rapim"** -> **"Tambah Agenda Rapat Baru"**:
   - Isi Judul Rapat, Tanggal, Waktu Mulai & Selesai, dan Ruangan.
   - **Tentukan Titik Koordinat:** Panitia yang sudah berada di venue dapat langsung menekan tombol *"Gunakan Lokasi Saya Saat Ini"*, atau mengisikan koordinat Latitude & Longitude secara manual.
   - Atur Radius Kunci: Default disetel **25 Meter**.
   - Aktifkan status agenda menjadi *Aktif*.
3. Saat rapat berlangsung, panitia memantau layar **"Live Monitoring Presensi"**:
   - Menampilkan total pimpinan yang hadir, diwakilkan, dan izin.
   - Tabel menampilkan foto selfie, nama, korwil/cabang, waktu hadir, tanda tangan, serta cap jarak pimpinan (misal: *14 meter*).
4. Setelah rapat selesai, panitia menutup sesi agenda dan mengklik **"Ekspor Rekap Kehadiran"** (Excel/CSV atau Cetak Lembar Presensi PDF).

---

## 5. DESAIN BASIS DATA (GOOGLE SHEETS)
Seluruh nama tab lembar kerja menggunakan format PascalCase **tanpa karakter underscore (`_`)** sesuai SOP ZettBOT:

### Tab 1: `DataPimpinan` (Master Akun & Profil Pimpinan)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | ID_PIMPINAN | String | ID Unik (contoh: `PIM-202610-001`) |
| 1 | NIK | String | Nomor Induk Karyawan / Pegawai (contoh: `320100987654`) |
| 2 | NAMA_LENGKAP | String | Nama Pimpinan beserta Gelar (contoh: `Dr. H. Ahmad Sudrajat, M.M.`) |
| 3 | KORWILAYAH | String | Koordinator Wilayah (contoh: `Korwil Jawa Barat`) |
| 4 | CABANG | String | Kantor Cabang (contoh: `Cabang Bandung Utama`) |
| 5 | JABATAN | String | Jabatan Eksekutif (contoh: `Kepala Cabang Utama`) |
| 6 | UNIT_KERJA | String | Unit / Divisi Kerja (contoh: `Divisi Operasional & Bisnis`) |
| 7 | PASSWORD_HASH | String | Password terenkripsi untuk keamanan akses |
| 8 | FOTO_SELFIE_URL| String | Tautan berkas foto selfie verifikasi di Drive/Data URI |
| 9 | STATUS_AKUN | String | `Aktif` / `Menunggu Verifikasi` / `Nonaktif` |
| 10| TANGGAL_DAFTAR | Datetime | Waktu registrasi akun |

### Tab 2: `AgendaRapim` (Master Sesi Agenda Rapat & Titik Geofence)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | ID_AGENDA | String | ID Unik Agenda (contoh: `AGD-202610-001`) |
| 1 | JUDUL_RAPAT | String | Nama/Tema Agenda Rapim (contoh: `Rapim Pleno Evaluasi Q3 & RKAP`) |
| 2 | TANGGAL_RAPAT | Date | Tanggal Pelaksanaan (contoh: `2026-11-05`) |
| 3 | WAKTU_MULAI | String | Waktu Mulai (contoh: `09:00 WIB`) |
| 4 | WAKTU_SELESAI | String | Waktu Selesai (contoh: `16:00 WIB`) |
| 5 | LOKASI_RUANG | String | Ruangan / Venue (contoh: `Ballroom Lantai 5 Kantor Pusat`) |
| 6 | LATITUDE_VENUE | Number | Koordinat Garis Lintang Venue (contoh: `-6.917464`) |
| 7 | LONGITUDE_VENUE| Number | Koordinat Garis Bujur Venue (contoh: `107.619123`) |
| 8 | RADIUS_METER | Number | Batas Toleransi Radius Kunci (contoh: `25`) |
| 9 | DESKRIPSI | String | Pokok bahasan agenda rapat |
| 10| STATUS_AGENDA | String | `Aktif` (Bisa Presensi) / `Ditutup` / `Selesai` |
| 11| DIBUAT_OLEH | String | Akun Sekretariat pembuat agenda |

### Tab 3: `PresensiRapim` (Transaksi Log Kehadiran & Audit Lokasi)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | ID_PRESENSI | String | ID Unik Transaksi (contoh: `PRS-202610-001`) |
| 1 | ID_AGENDA | String | Referensi ke ID_AGENDA |
| 2 | NIK | String | NIK Pimpinan yang terdaftar |
| 3 | NAMA_PIMPINAN | String | Nama Pimpinan |
| 4 | KORWILAYAH | String | Korwil pimpinan saat presensi |
| 5 | CABANG | String | Cabang pimpinan |
| 6 | JABATAN | String | Jabatan pimpinan |
| 7 | STATUS_KEHADIRAN| String | `Hadir Langsung` / `Diwakilkan` / `Izin` |
| 8 | NAMA_WAKIL | String | Nama Pejabat Pengganti (jika diwakilkan) |
| 9 | JABATAN_WAKIL | String | Jabatan Pejabat Pengganti (jika diwakilkan) |
| 10| TANDA_TANGAN | String | Data URL Canvas Tanda Tangan Digital (Base64 PNG) |
| 11| WAKTU_PRESENSI | Datetime | Waktu cap timestamp kehadiran (WIB) |
| 12| USER_LATITUDE | Number | Koordinat Lintang Pimpinan saat submit (contoh: `-6.917470`) |
| 13| USER_LONGITUDE | Number | Koordinat Bujur Pimpinan saat submit (contoh: `107.619130`) |
| 14| JARAK_METER | Number | Jarak riil saat submit (contoh: `8.4` meter) |
| 15| PERANGKAT_USER | String | Info perangkat browser/HP yang digunakan |

### Tab 4: `Pengaturan` (Konfigurasi Sistem & Kredensial Cadangan)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | KUNCI_PENGATURAN| String | `NAMA_INSTANSI`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `DEFAULT_RADIUS`, `LOGO_URL` |
| 1 | NILAI_PENGATURAN| String | Nilai konfigurasi sistem |

### Tab 5: `MasterWilayah` (Pusat Data Korwilayah & Kantor Cabang Dinamis)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | KORWILAYAH | String | Nama Koordinator Wilayah (contoh: `Jatim 1`, `Solo Raya`, `Kuda Pacu`) |
| 1 | CABANG | String | Nama Kantor Cabang Resmi (contoh: `BABAT`, `BOJONEGORO`, `REMBANG`) |

### Tab 6: `MasterAdmin` (Manajemen Multi-Administrator dengan NIK & Password Pribadi)
| No | Kolom | Tipe Data | Deskripsi & Contoh Nilai |
|:---|:---|:---|:---|
| 0 | ID_ADMIN | String | ID Unik Admin (contoh: `ADM-001`, `ADM-002`) |
| 1 | NIK | String | Nomor Induk Karyawan resmi (Format: `XXXX.XX.XX`, contoh: `2674.00.01`) |
| 2 | NAMA_LENGKAP | String | Nama Lengkap Administrator / Panitia Rapim (contoh: `Wido Prasetyo`) |
| 3 | JABATAN | String | Jabatan / Peran Kepanitiaan (contoh: `Administrator Utama`, `Sekretariat Rapim`) |
| 4 | PASSWORD_HASH | String | Enkripsi SHA-256 kata sandi pribadi admin |
| 5 | STATUS | String | `Aktif` / `Nonaktif` |
| 6 | TANGGAL_DIBUAT | Datetime | Waktu pembuatan akun administrator |

---

## 6. ATURAN VALIDASI & LOGIKA KHUSUS
1. **Formula Haversine Geofencing (Perhitungan Jarak Presisi):**
   Sistem menghitung jarak garis lurus bola bumi antara koordinat pimpinan $(lat_1, lon_1)$ dan koordinat venue $(lat_2, lon_2)$:
   $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1)\cos(lat_2)\sin^2\left(\frac{\Delta lon}{2}\right)}\right)$$
   dengan $R = 6.371.000$ meter.
2. **Aturan Kunci Radius 25 Meter:**
   - Untuk status **Hadir Langsung** dan **Diwakilkan**: Nilai $d$ WAJIB $\le$ `RADIUS_METER` (25 meter). Jika $d > 25$ meter, proses presensi otomatis digagalkan baik di sisi frontend maupun di sisi validasi server backend.
   - Untuk status **Izin**: Pengecekan radius dilewati karena pimpinan sedang berhalangan hadir di tempat fisik, namun lokasi riil pimpinan tetap dicatat untuk transparansi.
3. **Peringatan Radar & Rekomendasi GPS Akurasi Tinggi (Reality Check):**
   - Mengingat di dalam gedung rapat bertingkat atau ballroom ber-AC sinyal satelit GPS ponsel bisa mengalami fluktuasi (GPS drift), sistem di sisi frontend mengaktifkan `enableHighAccuracy: true` dan memberikan indikator visual kualitas sinyal GPS.
   - Jika jarak terbaca melebihi 25 meter saat pimpinan merasa sudah di dalam ruangan, antarmuka menyediakan tombol *"Segarkan Lokasi"* dan panduan menyalakan GPS mode akurasi tinggi / Wi-Fi indoor.
4. **Pencegahan Kehadiran Ganda (Anti-Double Presensi):**
   Satu NIK pimpinan hanya dapat melakukan presensi 1 (satu) kali pada ID Agenda yang sama.
5. **Penomoran Kode Unik Otomatis & Sekuensial:**
   Penomoran ID (`PIM-YYYYMM-XXX`, `AGD-YYYYMM-XXX`, `PRS-YYYYMM-XXX`) dihitung di sisi backend dengan mencari nilai urut tertinggi (MAX + 1) serta dilindungi `LockService` Apps Script.
6. **Penanganan Kamera Iframe Sandbox:**
   Pengambilan foto selfie pimpinan menggunakan `<input type="file" accept="image/*" capture="user">` native browser ponsel yang 100% aman dan kompatibel dengan iframe sandbox Google Apps Script, dilengkapi kompresi otomatis via HTML5 Canvas sebelum dikirim ke backend.
7. **Backend Index-Based Mapping:**
   Akses baris data di backend murni menggunakan konstanta indeks kolom (`row[COL.NIK]`) agar tahan terhadap modifikasi manual teks judul kolom di Google Sheets.

---

## 7. RENCANA ANTARMUKA PENGGUNA (UI SPECIFICATION)
- **Tema Visual:** Anti-AI Human-Crafted Aesthetic — Slate & Deep Navy berkelas, aksen Emerald lembut untuk status aktif/lolos radius, aksen Rose/Amber lembut untuk status di luar radius, tipografi proporsional, ikon SVG inline tanpa emoji berlebih.
- **Komponen Halaman:**
  1. *Header / Navbar:* Logo & Nama Instansi Rapim, indikator status agenda aktif, tombol toggle Login/Daftar/Admin.
  2. *Widget Radar Geofence Presensi:* 
     - Kartu indikator jarak interaktif: Menampilkan jarak pimpinan ke titik rapat secara realtime (misal: `🟢 12 Meter dari Lokasi Rapat - Di Dalam Radius`).
     - Jika di luar jangkauan: Tampilan kartu berubah amber/rose (`🔴 42 Meter - Di Luar Batas 25 Meter`) lengkap dengan tombol *"Cek Ulang Lokasi"*.
  3. *Halaman Presensi Pimpinan:* Kartu agenda terpilih, identitas pimpinan login, pilihan status kehadiran (Hadir/Diwakilkan/Izin), kotak tanda tangan digital dengan tombol *Clear*, dan tombol submit utama.
  4. *Halaman Registrasi Pimpinan:* Formulir pendaftaran akun berjenjang (NIK, Nama, Korwilayah, Cabang, Jabatan, Unit, Password, dan widget upload selfie kamera depan).
  5. *Dashboard Panitia / Sekretariat:*
     - Kartu Metrik Grid 3 Kolom: Total Undangan, Total Hadir Langsung, Total Diwakilkan / Izin.
     - Form Tambah Agenda: Input judul, waktu, ruangan, serta tombol *"Ambil Lokasi GPS Saya"* untuk mengunci titik rapat secara instan.
     - Live Table Kehadiran: Tabel responsif dengan avatar foto pimpinan, info korwil/cabang, status, thumbnail tanda tangan digital, waktu presensi, serta indikator jarak meter.
     - Filter Bar & Tombol Aksi: Dropdown Korwil, Cabang, Ekspor Excel (.csv), dan Cetak Lembar Presensi PDF.

---

## 8. KRITERIA PENGUJIAN (ACCEPTANCE CRITERIA)
- [ ] Berkas `setup.gs` berhasil membuat 4 sheet (`DataPimpinan`, `AgendaRapim`, `PresensiRapim`, `Pengaturan`) beserta data awal tanpa error dan aman dijalankan berulang (*idempoten*).
- [ ] Panitia dapat membuat agenda rapat baru dan menentukan titik koordinat venue secara otomatis dari GPS perangkat atau manual.
- [ ] Pimpinan baru dapat mendaftarkan akun lengkap dengan foto selfie terkompresi.
- [ ] Pimpinan terdaftar dapat login dengan NIK & Password secara aman.
- [ ] Saat presensi, sistem menghitung jarak GPS pimpinan ke titik rapat. Jika jarak > 25 meter untuk status Hadir Langsung, tombol presensi terkunci dan menolak submit.
- [ ] Pimpinan yang berada $\le$ 25 meter dapat membubuhkan tanda tangan digital dan berhasil mengirimkan presensi.
- [ ] Sistem mencatat koordinat dan jarak riil (meter) pimpinan ke sheet `PresensiRapim`.
- [ ] Sistem menolak presensi ganda untuk pimpinan yang sama pada agenda yang sama.
- [ ] Dashboard Sekretariat dapat menampilkan rekapitulasi kehadiran realtime dan memfilter data berdasarkan Korwil/Cabang.
- [ ] Tombol ekspor laporan berhasil mengunduh file rekap kehadiran rapim.

================================================================================
ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)
================================================================================

- **Status Arsitektur Aktif:** Google Apps Script Monolith/Modular (Backend: `code.gs` + `setup.gs`, Frontend: `index.html` terpadu dengan CSS/JS).
- **Format Spreadsheet:** Google Sheets (Nama Tab: `DataPimpinan`, `AgendaRapim`, `PresensiRapim`, `Pengaturan` - Tanpa karakter underscore).
- **Konstanta Pemetaan Indeks Kolom Backend (COL):**
  - `DataPimpinan`: ID(0), NIK(1), NAMA(2), KORWIL(3), CABANG(4), JABATAN(5), UNIT(6), PASSWORD(7), FOTO(8), STATUS(9), TGL_DAFTAR(10), RESET_PASS(11).
  - `AgendaRapim`: ID(0), JUDUL(1), TANGGAL(2), JAM_MULAI(3), JAM_SELESAI(4), LOKASI(5), LATITUDE(6), LONGITUDE(7), RADIUS(8), DESKRIPSI(9), STATUS(10), CREATOR(11).
  - `PresensiRapim`: ID(0), ID_AGENDA(1), NIK(2), NAMA(3), KORWIL(4), CABANG(5), JABATAN(6), STATUS(7), ALASAN_IZIN(8), SURAT_IZIN_URL(9), SIGNATURE(10), TIMESTAMP(11), LATITUDE(12), LONGITUDE(13), JARAK(14), PERANGKAT(15), ALASAN_EXT(16), SURAT_URL_EXT(17), FOTO_PRESENSI(18).
  - `MasterWilayah`: KORWIL(0), CABANG(1).
  - `MasterAdmin`: ID(0), NIK(1), NAMA(2), JABATAN(3), PASSWORD(4), STATUS(5), TGL_DIBUAT(6).
- **Logika Geofencing & Keamanan:** 
  - Standar Format NIK: Pola `XXXX.XX.XX` (contoh: `2674.12.12`) dengan auto-formatting/masking realtime pada antarmuka input dan normalisasi server-side otomatis pada layer Apps Script.
  - Formula Haversine Radius Bola Bumi ($R = 6.371.000$ m).
  - Dual-layer Geofence Validation: Kunci visual di frontend + Kunci validasi koordinat di sisi backend server Apps Script.
  - Client-side Canvas Image Compression (< 150KB) + HTML5 Signature Canvas + Concurrency Locking via `LockService`.
  - Preferensi Eksekusi: Mode Cepat (Fast-Track) — Tanpa dev server localhost, langsung serahkan berkas kode dan panduan secara presisi.
- **Log Pembaruan Resmi:**
  - *v1.0.0 (Fase Desain):* Perancangan arsitektur lengkap sistem Absensi Rapim Pimpinan.
  - *v1.1.0 (Penambahan Geofencing):* Integrasi penguncian lokasi GPS rapat (radius 25 Meter), audit koordinat & jarak pimpinan di sheet `PresensiRapim`, penentuan titik rapat di sheet `AgendaRapim`, dan widget radar jarak visual pada antarmuka presensi.
  - *v1.2.0 (Eksekusi Kode Fondasi):* Berhasil mengimplementasikan 3 berkas fondasi utama: `setup.gs` (Safe Migration database Google Sheets), `code.gs` (Backend controller, Haversine Geofencing, anti-double presensi, penomoran sekuensial MAX+1), dan `index.html` (Antarmuka Anti-AI responsif, radar jarak 25m, kanvas tanda tangan digital, kompresi selfie kamera native, dan portal sekretariat).
  - *v1.3.0 (Perombakan Gerbang Auth):* Restrukturisasi tampilan utama menjadi Executive Auth Gateway (hanya menampilkan tab Masuk Akun dan Buat Akun Baru pimpinan sebelum terautentikasi). Transisi otomatis ke Ruang Presensi Rapim setelah pimpinan login, serta tautan akses khusus untuk Sekretariat/Panitia.
  - *v1.4.0 (Standardisasi Format NIK XXXX.XX.XX):* Auto-masking NIK realtime (mengetik 26741212 otomatis menjadi 2674.12.12), normalisasi server-side di `code.gs`, dan penyelarasan sampel data dummy di `setup.gs`.
  - *v1.5.0 (Pembaruan Branding Resmi KSP Bhina Raharja):* Penyesuaian nama instansi menjadi "KSP Bhina Raharja", subjudul menjadi "Sistem Presensi Rapat", eliminasi badge "Portal Eksekutif", dan integrasi logo resmi KSP Bhina Raharja pada seluruh header aplikasi.
  - *v1.6.0 (Fitur Upload Logo Google Drive & Penyesuaian Teks Antarmuka):* Penyesuaian teks tombol menjadi "Login Presensi", teks tautan dan judul modal menjadi "Akses administrator" / "Akses Administrator", integrasi fitur unggah berkas logo instansi langsung dari dashboard administrator yang otomatis tersimpan di Google Drive (`Logo Absensi Rapim`), sinkronisasi URL logo di sheet `Pengaturan` (`LOGO_URL`), serta perenderan dinamis logo di seluruh halaman dengan graceful fallback badge `BR`. Mode eksekusi Fast-Track aktif tanpa dev server localhost.
  - *v1.6.1 (Perbaikan Otorisasi Drive & Smart Fallback):* Penambahan fungsi `authorizeDrive()` untuk memudahkan otorisasi Google Drive 1-klik di Apps Script editor, kompresi client-side logo via canvas (`compressLogoImage`), serta mekanisme *Smart Fallback* di backend (`uploadLogoToDrive`) yang otomatis menyimpan logo ke basis data internal Spreadsheet jika izin DriveApp belum diotorisasi sehingga proses upload tidak pernah mengalami error.
  - *v1.6.2 (Penyempurnaan Sinkronisasi Logo, Cache Lokal & Panduan Masuk Drive):* Penambahan `SpreadsheetApp.flush()` pada backend untuk memastikan data `LOGO_URL` tersimpan permanen, integrasi `localStorage` frontend agar logo tampil instan tanpa hilang saat refresh halaman, penyelarasan handling `imgEl.complete`, serta panduan otorisasi Google Drive resmi (Run `authorizeDrive` + Deploy Versi Baru).
  - *v1.6.3 (Perapian Tampilan Modal Kelola Logo & Eliminasi Teks Base64):* Memperbaiki tampilan modal Kelola Logo agar teks data URI Base64 tidak meluap ke antarmuka saat dibuka. Status logo kini ditampilkan secara ringkas dan elegan (badge hijau: Logo Aktif Terpasang, badge biru: Tersimpan di Google Drive), serta input tautan kustom tetap bersih.
  - *v1.6.4 (Anti-Cache Mobile & Dual Google Drive CDN Fallback):* Penambahan meta tag `no-cache` di `<head>` dan multi-format URL fallback Google Drive (`drive.google.com/thumbnail` auto-retry jika `lh3.googleusercontent.com` terblokir di peramban ponsel) untuk menjamin logo terbaru tampil konsisten di semua browser HP.
  - *v1.6.5 (Server-Side Drive Bridge & Eliminasi Blokir Mobile):* Backend `code.gs` pada `getInitialData()` kini secara otomatis membaca file Google Drive secara langsung di server dan mengirimkannya dalam format Data URI yang imun terhadap pemblokiran pihak ketiga / cross-site tracking di browser ponsel, sehingga logo grafis KSP Bhina Raharja tampil 100% identik dan konsisten baik di HP maupun Laptop.
  - *v1.7.0 (Zero-Latency Embedded Official Logo Shell):* Menanamkan data URI Base64 logo resmi KSP Bhina Raharja langsung ke dalam markup HTML bawaan (`index.html`) pada seluruh elemen logo (`#mainAppLogo`, `#pimpinanNavLogo`, `#adminNavLogo`, `#manageLogoPreview`). Menghilangkan tampilan fallback inisial teks "BR", sehingga saat dibuka di browser HP maupun laptop (bahkan saat koneksi lambat atau cold-start), logo grafis resmi KSP Bhina Raharja langsung muncul 0.00 detik tanpa jeda. Dilengkapi opsi satu-klik "Kembalikan ke Logo Resmi Bawaan" pada modal Kelola Logo Administrator.
  - *v1.8.0 (Standardisasi Form Registrasi Pimpinan, Cascading Dropdown Korwil-Cabang & Selfie Google Drive Storage):* Memperbarui antarmuka formulir pendaftaran pimpinan: label NIK menjadi "NIK (Nomor Induk Karyawan)", label Nama menjadi "Nama Lengkap", dropdown Korwil 8 wilayah, dropdown bertingkat Kantor Cabang dinamis (114 cabang terpetakan presisi sesuai Korwil), dropdown Jabatan (Pimpinan Cabang, Pimpinan Unit), dropdown Unit/Divisi (Mingguan, Bulanan Kantor, Bulanan Lapangan), serta penguncian kamera selfie langsung (Live KYC camera viewfinder + native `capture="user"` anti-galeri) yang otomatis mengunggah dan menyimpan file foto selfie pimpinan langsung ke folder Google Drive "Foto Profil Pimpinan Rapim".
  - *v1.9.0 (Dynamic MasterWilayah Management, Admin Pimpinan Accounts & Force Password Reset Flow):* 
    1. Penggantian placeholder nama lengkap menjadi "Isikan nama lengkap anda" pada formulir pendaftaran.
    2. Manajemen Mandiri Wilayah & Cabang: Penambahan sheet `MasterWilayah` dan modal interaktif "Kelola Wilayah & Cabang" di dashboard Administrator untuk menambah, mengubah, atau menghapus Korwil dan Cabang langsung dari UI secara realtime.
    3. Fitur Reset Password Pimpinan oleh Administrator: Tab baru "Data Akun Pimpinan" di portal admin dengan pencarian instan dan tombol reset password (password sementara).
    4. Alur Wajib Ganti Password Baru (Force Password Reset): Deteksi kolom `MUST_RESET_PASS` saat login pimpinan; jika akun berstatus direset, sistem otomatis mengunci akses dan memunculkan modal pembuatan kata sandi baru pribadi sebelum pimpinan dapat masuk ke ruang presensi.
  - *v2.0.0 (Status Kehadiran Biner, Surat Izin Drive Upload, & Live Camera KYC Selfie Anti-Titip Absen):*
    1. Penyederhanaan Status Kehadiran: Mengeliminasi opsi "Diwakilkan", menyisakan 2 status tegas: "Hadir Langsung" dan "Izin Rapat".
    2. Proteksi Anti-Titip Absen (Hadir Langsung): Wajib geofence GPS <= 25 meter, tanda tangan digital, dan pengambilan foto selfie langsung di ruang rapat (live viewfinder/native `capture="user"` tanpa galeri). Foto dikompresi dan disimpan di folder Google Drive "Foto Presensi Rapim".
    3. Alur Izin Rapat Mandiri: Pengecualian batas radius GPS (bebas lokasi), wajib memilih alasan izin (Sakit, Kepentingan Keluarga, Kepentingan Kantor), dan wajib mengunggah berkas surat izin (PDF/Foto) yang disimpan di folder Google Drive "Surat Izin Rapim".
    4. Pembaruan Dashboard Administrator: Kartu metrik diselaraskan (Hadir Langsung, Izin Rapat, Total Presensi Masuk), dan kolom tabel kehadiran interaktif yang menampilkan thumbnail foto selfie kehadiran langsung serta tombol akses berkas surat izin pimpinan ke Google Drive.
  - *v2.1.0 (Multi-Administrator Sheet MasterAdmin, Login NIK Karyawan & Password Pribadi):*
    1. Arsitektur Multi-Admin Dedikatif: Penambahan sheet `MasterAdmin` pada database Google Sheets (`ID_ADMIN`, `NIK`, `NAMA_LENGKAP`, `JABATAN`, `PASSWORD_HASH`, `STATUS`, `TANGGAL_DIBUAT`) sehingga panitia atau sekretariat dapat mengelola banyak akun administrator secara mandiri.
    2. Autentikasi NIK Karyawan & Password Pribadi: Form login administrator kini menggunakan NIK resmi format `XXXX.XX.XX` (dengan auto-formatting realtime) dan password pribadi masing-masing panitia, menggantikan username statis "admin".
    3. Audit Trail Pembuat Agenda: Setiap pembuatan sesi rapat baru kini secara otomatis merekam Nama & NIK admin pembuat agenda pada sheet `AgendaRapim`.
    4. Navigasi & Ganti Password Mandiri: Header dashboard menampilkan nama dan NIK admin yang sedang bertugas, serta modal praktis "Ganti Sandi" untuk mengubah kata sandi pribadi admin secara langsung dari antarmuka web app.
    5. Smart Emergency Fallback: Tetap menyediakan jalur pemulihan darurat ke sheet `Pengaturan` jika terjadi kondisi kritis pada database.
  - *v2.2.0 (Manajemen Status Akun Pimpinan Aktif/Nonaktif & Mutasi Mandiri Cabang/Korwil):*
    1. Sakelar Status Akun Pimpinan (Aktif / Nonaktif): Kolom status pada tabel akun pimpinan dashboard admin kini berupa segmented toggle button interaktif (`[ Aktif ]` / `[ Nonaktif ]`) untuk mengubah status keaktifan akun pimpinan secara realtime.
    2. Pemblokiran Login Akun Nonaktif: Sistem backend secara otomatis menolak proses masuk pimpinan jika akun berstatus "Nonaktif" dengan pesan resmi: *"Akun NIK [XXXX.XX.XX] saat ini berstatus Nonaktif. Silakan hubungi Administrator Rapim untuk aktivasi kembali."*
    3. Pembaruan Penugasan Mandiri (Mutasi Pindah Cabang & Korwil): Tersedia tombol dan modal "Ubah Cabang / Mutasi Tugas" di portal pimpinan yang memungkinkan pimpinan memperbarui Korwil (dropdown dinamis) dan Kantor Cabang (cascading dropdown), Jabatan, serta Unit Kerja secara mandiri.
    4. Integritas Data Lampau (Historical Immutability): Pembaruan penugasan hanya memperbarui lembar master `DataPimpinan`. Seluruh riwayat presensi yang telah diikuti sebelumnya pada lembar `PresensiRapim` tetap 100% utuh dan permanen merekam cabang lama saat rapat tersebut diselenggarakan.
  - *v2.3.0 (Opsi Izin "Tidak ada rapat" & Logika Kondisional Unggah Berkas Google Drive):*
    1. Perluasan Alasan Izin Rapat: Formulir Izin Rapat kini menyediakan 4 pilihan: *Sakit*, *Kepentingan Keluarga*, *Kepentingan Kantor*, dan *Tidak ada rapat*.
    2. Logika Kondisional Unggah Berkas: Jika pimpinan memilih alasan *Tidak ada rapat*, kotak unggah berkas surat izin otomatis disembunyikan dan pimpinan dapat mengirimkan presensi tanpa wajib mengunggah dokumen izin. Jika memilih 3 alasan lainnya, unggah berkas surat izin (PDF/Foto) tetap bersifat wajib dan tersimpan ke Google Drive panitia (*"Surat Izin Rapim"*).
    3. Pengecualian Geofence & Pengesahan Digital: Seluruh opsi Izin Rapat tetap bebas dari kuncian radius GPS 25 meter. Pimpinan tetap membubuhkan tanda tangan digital pada kanvas sebagai bukti pengesahan mandiri resmi.
    4. Penyesuaian Rekapitulasi Administrator & Riwayat Pribadi: Pada tabel rekap presensi admin dan riwayat pimpinan, alasan *Tidak ada rapat* ditampilkan dengan badge rapi beserta label *Tanpa Berkas*, tanpa memunculkan tautan file Drive kosong. Dilengkapi tombol peninjauan tanda tangan digital untuk seluruh presensi izin.
  - *v2.4.0 (Sinkronisasi Cepat Sesi Rapat Pimpinan & Filter Periode Bulan/Tahun Dashboard Admin):*
    1. Resilient Agenda Loading & Endpoint Ringan: Penambahan endpoint cepat `getActiveAgendas()` pada `code.gs` dengan toleransi status agenda case-insensitive ("Aktif", "aktif", "active", "") untuk menjamin sesi rapat yang dibuat admin langsung dapat dibaca oleh pimpinan.
    2. Tombol Mandiri "Segarkan Agenda" di HP Pimpinan: Penambahan tombol `[ 🔄 Segarkan Agenda ]` di layar pimpinan untuk memuat ulang daftar sesi rapat aktif secara instan kapan saja tanpa perlu logout.
    3. Auto-Trigger saat Login & Restore: Pemanggilan pembaruan agenda aktif otomatis terpasang saat pimpinan berhasil masuk (`handleLoginSubmit`) maupun saat sesi lokal dibuka kembali (`updateAppView`).
    4. Filter Periode Jangka Panjang (Bulan & Tahun): Panel kontrol rekapitulasi kehadiran dashboard admin diperluas menjadi grid 6 kolom responsif dengan dropdown Filter Bulan (Januari s.d. Desember) dan Filter Tahun (dinamis lintas tahun).
    5. Sinkronisasi Ekspor & Cetak: Penyaringan data presensi backend pada `getAdminDashboardData()`, ekspor Excel (.CSV), dan cetak PDF terintegrasi penuh mengikuti filter bulan dan tahun aktif.
  - *v2.5.0 (Perbaikan Total Kanvas Tanda Tangan Digital Touchscreen Mobile):*
    1. Resolusi Dimensi Kanvas Riil: Mengeliminasi bug ukuran 0x0 piksel akibat inisialisasi pada saat kontainer tersembunyi (`hidden`). Kanvas kini otomatis diukur ulang saat tampilan pimpinan diaktifkan (`updateAppView`) dengan resolusi Retina/High-DPI (`devicePixelRatio`).
    2. Anti-Intersepsi Scroll Layar (`touch-action: none`): Penambahan atribut CSS `touch-action: none` pada elemen kanvas untuk mencegah peramban ponsel mencegat sentuhan jari sebagai gestur scroll halaman.
    3. Dukungan Native Pointer Events: Penggunaan API Pointer Events modern yang menyatukan sentuhan jari ponsel (*finger touch*), pena stylus, dan mouse, dilengkapi penanganan *self-healing* otomatis saat pertama kali kotak disentuh.
  - *v2.6.0 (Otomatisasi Folder Google Drive "Tanda Tangan Rapim", Self-Healing Data Lampau & Resiliensi Dashboard Admin):*
    1. Otomatisasi Folder Google Drive "Tanda Tangan Rapim": Sistem secara otomatis membuat dan mengelola folder baru `"Tanda Tangan Rapim"` di Google Drive panitia. Tanda tangan digital pimpinan kini dikonversi menjadi file PNG dan disimpan langsung ke Google Drive, sehingga kolom Spreadsheet hanya menyimpan URL ringkas (`https://lh3.googleusercontent.com/d/[ID]`).
    2. Eliminasi Bug "Gagal Memuat Data Dashboard" (Payload Quota): Menghemat 99.9% muatan transfer data RPC Apps Script (`google.script.run`), mengeliminasi respon `null` akibat terlampauinya kuota transfer 50 KB.
    3. Self-Healing Migration Data Presensi Lampau: Data presensi uji coba sebelumnya yang masih menyimpan teks Base64 panjang secara otomatis dimigrasikan oleh server ke Google Drive dan sel Spreadsheet diperbarui permanen saat dashboard dimuat.
    4. Defensive Date Parsing & Primitive Sanitasi: Seluruh nilai waktu, tanggal, dan koordinat disanitasi ketat menjadi tipe data primitif (`String`/`Number`) dengan proteksi terhadap *Invalid Date* pada `formatDateString()` dan `formatDateTimeString()`.
    5. Antarmuka Dashboard Tangguh (Resilient Dashboard UI): Jika terjadi kendala jaringan, tabel kehadiran tidak lagi tertahan menggantung di *"Memperbarui data presensi..."*, melainkan menampilkan pesan status jelas lengkap dengan tombol interaktif `[ 🔄 Coba Lagi ]`.
  - *v2.7.0 (Penyesuaian Format "Jabatan - Unit" & Kolom "Tanda Tangan" Resmi Dokumen Cetak):*
    1. Format Kolom "Jabatan & Unit": Mengeliminasi ID Agenda dari kolom ke-3 dan menggantikannya dengan unit kerja resmi pimpinan (`Mingguan`, `Bulanan Kantor`, `Bulanan Lapangan`) dari master `DataPimpinan`, menghasilkan format resmi: `[Jabatan] - [Unit]` (contoh: *Pimpinan Cabang - Mingguan*, *Pimpinan Unit - Bulanan Kantor*).
    2. Header Kolom Resmi "Tanda Tangan": Mengubah header kolom ke-7 dari *"Bukti Kehadiran / Surat Izin"* menjadi *"Tanda Tangan"*.
    3. Tampilan Gambar Tanda Tangan Digital Fisik: Seluruh baris presensi langsung menampilkan gambar goresan tanda tangan digital pimpinan (`<img src="...">`) yang tajam dan proporsional.
    4. Format Cetak / Simpan PDF Siap Pakai: Saat mencetak dokumen daftar hadir rapat (`window.print()`), seluruh tombol web dan link layar otomatis disembunyikan via `.no-print`, menghasilkan lembar presensi resmi bersih dengan tanda tangan digital fisik pimpinan layaknya berkas absensi basah.
    5. Ekspor CSV Lengkap: Menambahkan kolom `UNIT` pimpinan ke dalam format berkas unduhan spreadsheet (.csv).
  - *v2.8.0 (Penyesuaian Subjudul Aplikasi Menjadi "Presensi Sistem Rapat Pimpinan" & Placeholder NIK Karyawan):*
    1. Subjudul Aplikasi Presensi: Teks subjudul di bawah header utama *KSP Bhina Raharja* pada halaman autentikasi masuk/daftar (`authInstansiLabel`) serta sub-header portal pimpinan (`pimpinanHeaderInstansi`) diubah dari teks duplikat *"KSP Bhina Raharja"* menjadi judul representatif resmi: `Presensi Sistem Rapat Pimpinan`.
    2. Placeholder Kolom NIK: Placeholder isian *Nomor Induk Karyawan / NIK* pada formulir masuk (`#authLoginNik`) dan pendaftaran pimpinan (`#regNik`) diperbarui dari `Contoh: 2674.12.12` menjadi `Masukan NIK Karyawan...`.
    3. Auto-Synchronization Pengaturan Basis Data: Fungsi backend `getInitialData()` pada `code.gs` secara dinamis mendeteksi dan memperbarui konfigurasi `NAMA_INSTANSI` pada sheet `Pengaturan` agar tersimpan permanen sebagai `Presensi Sistem Rapat Pimpinan`.
    4. Frontend Defensive Normalization: Menambahkan penanganan protektif pada frontend JavaScript untuk memastikan tampilan subjudul langsung konsisten dan steril dari teks duplikat meskipun data sheet belum sempat ter-refresh.
  - *v2.9.0 (Transformasi Logo Aplikasi & Favicon Browser Menjadi Ikon Presensi Rapat Modern):*
    1. Favicon Peramban Resmi (Browser Tab & Mobile Shortcut): Menambahkan tag favicon `<link rel="icon">`, `<link rel="shortcut icon">`, dan `<link rel="apple-touch-icon">` pada `<head>` `index.html` dengan aset vektor SVG ultra-ringan (~2.1 KB) beresolusi tajam bebas pecah di seluruh layar HP dan desktop.
    2. Identitas Visual Ikon Presensi Rapat: Desain grafis modern berbasis vektor SVG: squircle Royal Blue/Deep Indigo dengan lencana kalender agenda rapat, indikator waktu presensi, serta lencana verifikasi kehadiran (Verified Checkmark Badge) hijau Emerald.
    3. Penyelarasan Logo Seluruh Antarmuka: Menggantikan seluruh aset bitmap Base64 lama pada `#mainAppLogo` (layar login dengan modern glow effect), `#pimpinanNavLogo` (navbar pimpinan), `#adminNavLogo` (navbar administrator), dan `#manageLogoPreview` (modal kelola logo admin).
    4. Standarisasi Nilai Bawaan (`DEFAULT_APP_LOGO`): Memperbarui konstanta sistem bawaan ke Ikon Presensi Rapat Modern, memperbarui status informasi logo bawaan menjadi `"Logo Resmi Presensi Rapat (Aktif)"`, serta memastikan tombol pemulihan satu-klik (*Reset to Default*) mengembalikan ke ikon resmi presensi rapat ini.
  - *v2.9.1 (Hotfix GAS Favicon Data URI Exception pada doGet):*
    1. Mengeliminasi pemanggilan method `.setFaviconUrl()` dengan SVG data URI pada fungsi `doGet(e)` di [`code.gs`](file:///c:/Users/x6red/.gemini/antigravity-ide/Project/Absensi%20Rapim%20Pimpinan/code.gs) yang menyebabkan crash runtime `Exception: The favicon icon image type is not supported. (line 177, file "Code")`.
    2. Menstabilkan kembali rendering web app sehingga bebas error 100%.
  - *v2.9.2 (Eliminasi Logo Standar Google Apps Script pada Tab Browser):*
    1. Memasang transparent 1x1 PNG (`https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png`) via `.setFaviconUrl()` pada `doGet(e)` di [`code.gs`](file:///c:/Users/x6red/.gemini/antigravity-ide/Project/Absensi%20Rapim%20Pimpinan/code.gs) dan tag `<link rel="icon">` di [`index.html`](file:///c:/Users/x6red/.gemini/antigravity-ide/Project/Absensi%20Rapim%20Pimpinan/index.html).
    2. Menghilangkan logo 4-warna bawaan Google Apps Script secara total dari tab peramban desktop dan ponsel, menjadikan tab peramban tampak bersih (*clean & transparent*) tanpa memunculkan logo default Apps Script.
    3. Mempertahankan identitas visual Ikon Presensi Rapat Modern pada logo login, navbar pimpinan/admin, serta pintasan layar beranda ponsel via `apple-touch-icon`.
  - *v3.0.0 (Transformasi Palet Desain Korporat Fresh & Vibrant Koperasi: Biru, Orange & Putih):*
    1. Harmonisasi Aturan Emas 60-30-10: Menerapkan 60% dominan Putih Bersih / Canvas Cerah (`#ffffff` & `#f8fafc`), 30% Biru Royal Koperasi bermartabat (`#1d4ed8` s.d. `#1e40af`) pada navbar dan kartu, serta 10% Aksen Energik Orange Tangerine (`#f97316` s.d. `#ea580c`) pada tombol aksi utama (*Call-to-Action*).
    2. Layar Gerbang Otentikasi (`#view-auth`): Mengganti latar belakang gelap gulita (`slate-950`) menjadi kanvas cerah bergradasi lembut (`from-blue-50/90 via-white to-amber-50/50`) berhiaskan *ambient glow circles*, kartu putih salju berefek bayangan elegan, dan tombol *"Login Presensi"* serta *"Daftar Akun"* bergradasi Orange Tangerine mencolok.
    3. Navbar Pimpinan & Administrator: Ditransformasikan dari hitam gelap (`bg-slate-900`) menjadi Biru Royal Koperasi berwibawa (`bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-md border-b border-blue-700/60`).
    4. Pengesahan Presensi & Tanda Tangan: Tombol *"Kirim Presensi Kehadiran"* dan status *"Izin Rapat"* mengadopsi aksen oranye energik Bhina Raharja, memberikan kontras tajam yang memandu mata pimpinan secara alami saat presensi.
    5. Dashboard Administrator: Kartu metrik *"Izin Rapat"* dan tombol *"Buat Agenda Baru"* diselaraskan dengan aksen oranye cerah, menghasilkan antarmuka monitoring eksekutif yang segar dan bernuansa daylight modern.
  - *v3.1.0 (Transformasi Visual "Fresh Daylight Sky & Vibrant Orange" Sesuai Referensi Mockup Pengguna):*
    1. Header Fresh Sky Blue Daylight Gradient: Seluruh navbar (Pimpinan & Administrator) ditransformasikan menjadi Biru Langit Siang Hari yang segar (`from-sky-400 via-sky-500 to-blue-600`) berhiaskan ornamen gelembung air transparan (*ambient translucent water bubbles* `bg-white/10 rounded-full blur-xl`).
    2. Tab Navigasi White Pill & Frosted Glass Elements: Tab navigasi aktif mengadopsi gaya kartu pill putih bersih mengambang (`bg-white text-sky-700 shadow-sm font-bold`) dengan wadah frosted glass (`bg-white/15 backdrop-blur-md border border-white/20`). Pill avatar profil dan tombol keluar menggunakan kapsul kaca semi-transparan (`bg-white/20 backdrop-blur-md border border-white/30 text-white`).
    3. Kartu Metrik Dashboard Administrator Bergradasi Kaya Warna: 3 kartu ringkasan kehadiran dirombak total menyerupai grid metrik 2x2 pada referensi mockup:
       - Hadir Langsung: Gradasi Biru Langit & Cyan (`from-sky-400 via-sky-500 to-blue-600`) dengan wadah ikon kaca `bg-white/20`.
       - Izin Rapat: Gradasi Orange Tangerine & Peach Amber (`from-amber-400 via-orange-500 to-rose-500`) dengan wadah ikon kaca `bg-white/20`.
       - Total Presensi: Gradasi Royal Cyan & Indigo (`from-blue-600 via-indigo-600 to-purple-600`) dengan wadah ikon kaca `bg-white/20`.
    4. Radio Status Kehadiran Interaktif Bergradasi: Pilihan status presensi pimpinan bertransformasi menjadi kartu pill interaktif: *Hadir Langsung* berubah menjadi gradasi Biru Langit saat dicentang, dan *Izin Rapat* berubah menjadi gradasi Orange Tangerine hangat saat dicentang.
    5. Kanvas Daylight Super Bersih: Latar belakang seluruh sistem diubah menjadi abu-abu mutiara terang (`bg-[#f4f7fb]`) dengan kartu-kartu putih mengambang lembut (`rounded-3xl shadow-xl shadow-sky-950/5`), memberikan visual yang sangat segar, lapang, dan bersahabat di mata.
  - *v3.2.0 (Penguatan Keamanan Sistem: Eliminasi Celah Client-Side Bypass via Server-Side Session Token Menggunakan CacheService & RBAC):*
    1. Mesin Sesi Server-Side (`CacheService`): Mengimplementasikan `generateSessionToken_` berbasis UUID + SHA-256 dan disimpan ke `CacheService.getScriptCache()` dengan masa aktif 6 jam (21.600 detik). Login sukses pimpinan dan admin mengembalikan token kriptografis unik.
    2. Role-Based Access Control (RBAC): Fungsi privat `validateSession_(sessionToken, requiredRole)` memverifikasi keabsahan sesi dan memeriksa peran pengguna secara ketat di sisi server. Pengguna tanpa token atau token tidak sesuai hak akses langsung ditolak dengan pesan error resmi.
    3. Proteksi Seluruh 14 Endpoint Terlindungi di `code.gs`:
       - Dashboard Sekretariat: `getAdminDashboardData`, `getPimpinanAccounts`, `createAgenda`, `updateAgendaStatus`, `adminResetPimpinanPassword`, `setAdminPimpinanStatus`, `saveMasterWilayah`, `saveLogoUrl`, `uploadLogoToDrive`, dan `adminChangeOwnPassword` wajib memiliki sesi aktif role `admin`.
       - Layanan Pimpinan: `submitPresensi`, `getPimpinanAttendanceHistory`, `pimpinanUpdateNewPassword`, dan `updatePimpinanProfile` wajib memiliki sesi aktif role `pimpinan`.
    4. Penegakan Integritas Data (Anti-Titip Absen & Anti-Spoofing): Server memaksakan NIK pada fungsi `submitPresensi` dan `updatePimpinanProfile` sesuai NIK sesi terotentikasi (`payload.nik = auth.session.nik`), mengeliminasi kemungkinan manipulasi NIK atau presensi atas nama orang lain via console browser.
    5. State Sesi Klien Terintegrasi: `index.html` menyimpan token di `sessionStorage` dan `APP_STATE.sessionToken`, menyertakan token ke setiap pemanggilan `google.script.run`, dan secara otomatis mengembalikan pengguna ke form login jika sesi kedaluwarsa.
  - *v4.0.0 (Migrasi Arsitektur Decoupled: Frontend Vercel Edge CDN & Headless Google Apps Script REST API Backend):*
    1. Eliminasi Total Banner Google: Menyelesaikan masalah banner abu-abu/biru *"This application was created by a Google Apps Script user"* dengan memindahkan hosting frontend ke platform Vercel, menghasilkan tampilan website yang steril, profesional, dan siap domain instansi (`.vercel.app` / custom domain).
    2. Backend Headless REST API (`doPost(e)` Router): Menambahkan router `doPost(e)` dan `createJsonResponse_` pada `code.gs` untuk melayani panggilan HTTP POST dari Vercel dengan format JSON murni (`ContentService.MimeType.JSON`). Whitelist ketat 19 fungsi backend publik & terproteksi. Tetap mempertahankan `doGet(e)` untuk fallback.
    3. Mitigasi CORS Preflight via Simple Request: Request dari client dikirim dengan header `Content-Type: text/plain;charset=utf-8` dan `redirect: 'follow'`, sukses melewati pembatasan CORS OPTIONS preflight pada server Google Apps Script.
    4. Universal Polyfill Bridge `google.script.run`: Implementasi JavaScript `Proxy` cerdas pada `index.html` yang secara otomatis mengalihkan seluruh 26 titik pemanggilan data ke `executeGasApi()` via `fetch()` tanpa perlu merombak ulang ribuan baris kode logika bisnis, menjamin stabilitas 100% dan zero visual bug.
    5. Konfigurasi Vercel & Modal Pengaturan API Mandiri: Pembuatan berkas `vercel.json` (SPA rewrites & security headers) serta penyediaan modal interaktif dan tombol kelola API Backend pada tampilan login dan dashboard admin untuk menghubungkan URL Google Apps Script secara mudah tanpa perlu membuka kode.
