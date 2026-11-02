/**
 * SISTEM ABSENSI RAPIM PIMPINAN - setup.gs
 * ==============================================================================
 * Skrip Inisialisasi Database Google Sheets & Safe Migration (Idempoten)
 * Sesuai Standar Rekayasa ZettBOT by Zettbos (Tanpa karakter underscore pada nama sheet)
 * ==============================================================================
 */

/**
 * Fungsi Utama Setup Database
 * Aman dijalankan berulang kali (Safe Migration):
 * 1. Membuat sheet jika belum ada (tanpa underscore).
 * 2. Menyelaraskan kolom baru di posisi paling kanan tanpa merusak/menghapus data riil.
 * 3. Menambahkan data contoh (dummy) HANYA jika sheet benar-benar baru/kosong.
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Spreadsheet aktif tidak ditemukan. Pastikan skrip ini terhubung dengan Google Sheets.");
  }

  // 1. Inisialisasi Sheet DataPimpinan
  var sheetPimpinan = getOrCreateSheet(ss, "DataPimpinan", [
    "ID_PIMPINAN",
    "NIK",
    "NAMA_LENGKAP",
    "KORWILAYAH",
    "CABANG",
    "JABATAN",
    "UNIT_KERJA",
    "PASSWORD_HASH",
    "FOTO_SELFIE_URL",
    "STATUS_AKUN",
    "TANGGAL_DAFTAR",
    "MUST_RESET_PASS"
  ]);

  // Isi data dummy pimpinan jika sheet baru kosong
  if (sheetPimpinan.getLastRow() === 1) {
    sheetPimpinan.appendRow([
      "PIM-202610-001",
      "2674.12.12",
      "Dr. H. Ahmad Sudrajat, M.M.",
      "Korwil Jawa Barat",
      "Cabang Bandung Utama",
      "Kepala Cabang Utama",
      "Divisi Operasional & Bisnis",
      hashString("pimpinan123"),
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      "Aktif",
      new Date()
    ]);
    sheetPimpinan.appendRow([
      "PIM-202610-002",
      "2675.01.05",
      "Ir. Hj. Siti Nurhaliza, M.T.",
      "Korwil DKI & Banten",
      "Cabang Jakarta Pusat",
      "Wakil Kepala Regional",
      "Divisi Perencanaan Strategis",
      hashString("pimpinan123"),
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      "Aktif",
      new Date()
    ]);
  }

  // 2. Inisialisasi Sheet AgendaRapim (Termasuk Titik Geofence)
  var sheetAgenda = getOrCreateSheet(ss, "AgendaRapim", [
    "ID_AGENDA",
    "JUDUL_RAPAT",
    "TANGGAL_RAPAT",
    "WAKTU_MULAI",
    "WAKTU_SELESAI",
    "LOKASI_RUANG",
    "LATITUDE_VENUE",
    "LONGITUDE_VENUE",
    "RADIUS_METER",
    "DESKRIPSI",
    "STATUS_AGENDA",
    "DIBUAT_OLEH"
  ]);

  // Isi data dummy agenda rapim jika sheet baru kosong
  if (sheetAgenda.getLastRow() === 1) {
    sheetAgenda.appendRow([
      "AGD-202610-001",
      "Rapat Pimpinan Pleno Q3 & Penetapan Rencana Kerja Tahunan",
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      "08:30 WIB",
      "16:00 WIB",
      "Ballroom Lantai 5 - Kantor Pusat",
      -6.917464, // Default Lat (Dapat diubah via dashboard panitia)
      107.619123, // Default Lon
      25, // Radius Kunci 25 Meter
      "Evaluasi target kinerja cabang seluruh korwil dan strategi ekspansi kuartal IV.",
      "Aktif",
      "Sekretariat Utama"
    ]);
  }

  // 3. Inisialisasi Sheet PresensiRapim (Audit Kehadiran, Tanda Tangan & Jarak Riil)
  getOrCreateSheet(ss, "PresensiRapim", [
    "ID_PRESENSI",
    "ID_AGENDA",
    "NIK",
    "NAMA_PIMPINAN",
    "KORWILAYAH",
    "CABANG",
    "JABATAN",
    "STATUS_KEHADIRAN",
    "NAMA_WAKIL",
    "JABATAN_WAKIL",
    "TANDA_TANGAN",
    "WAKTU_PRESENSI",
    "USER_LATITUDE",
    "USER_LONGITUDE",
    "JARAK_METER",
    "PERANGKAT_USER",
    "ALASAN_IZIN",
    "SURAT_IZIN_URL",
    "FOTO_PRESENSI_URL"
  ]);

  // 4. Inisialisasi Sheet Pengaturan (Konfigurasi & Kredensial Admin)
  var sheetPengaturan = getOrCreateSheet(ss, "Pengaturan", [
    "KUNCI_PENGATURAN",
    "NILAI_PENGATURAN"
  ]);

  if (sheetPengaturan.getLastRow() === 1) {
    sheetPengaturan.appendRow(["NAMA_INSTANSI", "Sistem Presensi Rapat"]);
    sheetPengaturan.appendRow(["ADMIN_USER", "admin"]);
    sheetPengaturan.appendRow(["ADMIN_PASS_HASH", hashString("admin123")]);
    sheetPengaturan.appendRow(["DEFAULT_RADIUS", "25"]);
    sheetPengaturan.appendRow(["LOGO_URL", ""]);
  }

  // 5. Inisialisasi Sheet MasterWilayah (Daftar Korwil & Cabang Resmi)
  var sheetWilayah = getOrCreateSheet(ss, "MasterWilayah", [
    "KORWIL",
    "CABANG"
  ]);

  if (sheetWilayah.getLastRow() === 1) {
    var defaultWilayahRows = [
      ["Jatim 1", "BABAT"], ["Jatim 1", "BATU MALANG"], ["Jatim 1", "BOJONEGORO"], ["Jatim 1", "JATIROGO"], ["Jatim 1", "JOMBANG"],
      ["Jatim 1", "KALITIDU"], ["Jatim 1", "LAMONGAN"], ["Jatim 1", "MERAKURAK"], ["Jatim 1", "MOJOKERTO"], ["Jatim 1", "PALANG TUBAN"],
      ["Jatim 1", "PASURUAN"], ["Jatim 1", "SINGOSARI"], ["Jatim 1", "TUBAN"],
      ["Jodipati", "BLITAR"], ["Jodipati", "DONOROJO"], ["Jodipati", "KEDIRI"], ["Jodipati", "KESAMBEN"], ["Jodipati", "MAGETAN"],
      ["Jodipati", "NAWANGAN"], ["Jodipati", "NGANJUK"], ["Jodipati", "NGAWI"], ["Jodipati", "PACITAN"], ["Jodipati", "PONOROGO"],
      ["Jodipati", "REJOTANGAN"], ["Jodipati", "SUDIMORO"], ["Jodipati", "TRENGGALEK"], ["Jodipati", "TULUNGAGUNG"], ["Jodipati", "WIDODAREN"], ["Jodipati", "WLINGI"],
      ["Solo Raya", "BAKI"], ["Solo Raya", "BOYOLALI"], ["Solo Raya", "GEMOLONG"], ["Solo Raya", "GONDANGREJO"], ["Solo Raya", "GUNUNGKIDUL"],
      ["Solo Raya", "KARANGANYAR"], ["Solo Raya", "KARANGPANDAN"], ["Solo Raya", "KERJO"], ["Solo Raya", "KLATEN"], ["Solo Raya", "MASARAN"],
      ["Solo Raya", "PEDAN"], ["Solo Raya", "SIMO"], ["Solo Raya", "SLEMAN"], ["Solo Raya", "SRAGEN"], ["Solo Raya", "SUKOHARJO"], ["Solo Raya", "WEDI"], ["Solo Raya", "WONOGIRI"],
      ["Kuda Pacu", "BLORA"], ["Kuda Pacu", "CEPU"], ["Kuda Pacu", "DEMAK"], ["Kuda Pacu", "GUBUG"], ["Kuda Pacu", "JEPARA"],
      ["Kuda Pacu", "KEDUNGTUBAN"], ["Kuda Pacu", "KELET"], ["Kuda Pacu", "KRAGAN"], ["Kuda Pacu", "KUDUS"], ["Kuda Pacu", "KUNDURAN"],
      ["Kuda Pacu", "LASEM"], ["Kuda Pacu", "MLONGGO"], ["Kuda Pacu", "NGAWEN"], ["Kuda Pacu", "PAMOTAN"], ["Kuda Pacu", "PATI KUNIRAN"],
      ["Kuda Pacu", "PURWODADI"], ["Kuda Pacu", "RANDUBLATUNG"], ["Kuda Pacu", "REMBANG"], ["Kuda Pacu", "WIROSARI"], ["Kuda Pacu", "WONOSALAM"],
      ["Panther Bersinar", "BANDAR"], ["Panther Bersinar", "BATANG"], ["Panther Bersinar", "BAWANG"], ["Panther Bersinar", "BOJA"], ["Panther Bersinar", "BOJONG"],
      ["Panther Bersinar", "BREBES"], ["Panther Bersinar", "BUMIAYU"], ["Panther Bersinar", "COMAL"], ["Panther Bersinar", "PEKALONGAN"], ["Panther Bersinar", "KENDAL"],
      ["Panther Bersinar", "KERSANA BREBES"], ["Panther Bersinar", "LIMPUNG"], ["Panther Bersinar", "PEMALANG"], ["Panther Bersinar", "RANDUDONGKAL"], ["Panther Bersinar", "SLAWI"], ["Panther Bersinar", "SUKOREJO"],
      ["Duto Utomo", "BANJARNEGARA"], ["Duto Utomo", "BANYUMAS"], ["Duto Utomo", "BOBOTSARI"], ["Duto Utomo", "GRABAG"], ["Duto Utomo", "KEMRANJEN"],
      ["Duto Utomo", "KLAMPOK"], ["Duto Utomo", "MAGELANG"], ["Duto Utomo", "NGADIREJO"], ["Duto Utomo", "PRINGSURAT"], ["Duto Utomo", "PURBALINGGA"],
      ["Duto Utomo", "SALATIGA"], ["Duto Utomo", "TEMANGGUNG"], ["Duto Utomo", "WANGON"], ["Duto Utomo", "WONOSOBO"],
      ["Kujang Kencana", "BAGELAN"], ["Kujang Kencana", "BANJARPATROMAN"], ["Kujang Kencana", "CILACAP MAJENANG"], ["Kujang Kencana", "CILACAP KOTA"], ["Kujang Kencana", "GARUT"],
      ["Kujang Kencana", "GOMBONG"], ["Kujang Kencana", "KEBUMEN"], ["Kujang Kencana", "KUTOARJO"], ["Kujang Kencana", "PATIMUAN"], ["Kujang Kencana", "PREMBUN"],
      ["Kujang Kencana", "PURWOREJO"], ["Kujang Kencana", "SIDAREJA"], ["Kujang Kencana", "TASIKMALAYA"],
      ["Pasundan Idaman", "BINONG"], ["Pasundan Idaman", "CIKIJING"], ["Pasundan Idaman", "DARMARAJA"], ["Pasundan Idaman", "INDRAMAYU"], ["Pasundan Idaman", "KAB CIREBON"],
      ["Pasundan Idaman", "KASOMALANG"], ["Pasundan Idaman", "KOTA CIREBON"], ["Pasundan Idaman", "KUNINGAN"], ["Pasundan Idaman", "MAJALENGKA"], ["Pasundan Idaman", "PATROL INDRAMAYU"],
      ["Pasundan Idaman", "SUBANG"], ["Pasundan Idaman", "SUMEDANG"]
    ];
    sheetWilayah.getRange(2, 1, defaultWilayahRows.length, 2).setValues(defaultWilayahRows);
    SpreadsheetApp.flush();
  }

  // 6. Inisialisasi Sheet MasterAdmin (Multi-Administrator dengan NIK & Password Pribadi)
  var sheetAdmin = getOrCreateSheet(ss, "MasterAdmin", [
    "ID_ADMIN",
    "NIK",
    "NAMA_LENGKAP",
    "JABATAN",
    "PASSWORD_HASH",
    "STATUS",
    "TANGGAL_DIBUAT"
  ]);

  if (sheetAdmin.getLastRow() === 1) {
    sheetAdmin.appendRow([
      "ADM-001",
      "2674.00.01",
      "Wido Prasetyo",
      "Administrator Utama",
      hashString("admin123"),
      "Aktif",
      new Date()
    ]);
  }

  Logger.log("Safe Migration Selesai: Seluruh sheet dan struktur database berhasil disiapkan secara aman.");
}

/**
 * Helper: Ambil Sheet atau Buat Baru jika belum ada
 * Mendukung Safe Migration penambahan kolom baru di paling kanan
 */
function getOrCreateSheet(ss, sheetName, expectedHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Pasang header awal
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    formatHeaderRow(sheet, expectedHeaders.length);
    return sheet;
  }

  // Jika sheet sudah ada: Lakukan sinkronisasi header (Safe Migration)
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    formatHeaderRow(sheet, expectedHeaders.length);
    return sheet;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missingHeaders = [];

  for (var i = 0; i < expectedHeaders.length; i++) {
    if (existingHeaders.indexOf(expectedHeaders[i]) === -1) {
      missingHeaders.push(expectedHeaders[i]);
    }
  }

  // Jika ada kolom baru, tambahkan di paling kanan tanpa merusak kolom yang ada
  if (missingHeaders.length > 0) {
    var startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    formatHeaderRow(sheet, lastCol + missingHeaders.length);
    Logger.log("Kolom baru berhasil ditambahkan pada sheet '" + sheetName + "': " + missingHeaders.join(", "));
  }

  return sheet;
}

/**
 * Helper: Format visual baris header (Dark Slate, Teks Putih, Freeze Row 1)
 */
function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground("#1e293b"); // Slate 800
  headerRange.setFontColor("#f8fafc"); // Slate 50
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

/**
 * Helper: Hashing string sederhana untuk kata sandi
 */
function hashString(input) {
  if (!input) return "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    var byteString = hashVal.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    txtHash += byteString;
  }
  return txtHash;
}

