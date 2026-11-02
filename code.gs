/**
 * SISTEM ABSENSI RAPIM PIMPINAN - code.gs
 * ==============================================================================
 * Backend Controller, API Endpoints, Geofencing Haversine, & Incremental ID Generator
 * Sesuai Standar Rekayasa ZettBOT by Zettbos (Index-Based Mapping, Safe Concurrency)
 * ==============================================================================
 */

// Konstanta Indeks Kolom Database (0-Based Array Mapping)
var COL_PIMPINAN = {
  ID: 0,
  NIK: 1,
  NAMA: 2,
  KORWIL: 3,
  CABANG: 4,
  JABATAN: 5,
  UNIT: 6,
  PASSWORD: 7,
  FOTO: 8,
  STATUS: 9,
  TGL_DAFTAR: 10,
  RESET_PASS: 11
};

/**
 * Master Data Korwil & Cabang Bawaan (Default 8 Korwil & 114 Cabang)
 */
var DEFAULT_MASTER_WILAYAH = {
  "Jatim 1": [
    "BABAT", "BATU MALANG", "BOJONEGORO", "JATIROGO", "JOMBANG",
    "KALITIDU", "LAMONGAN", "MERAKURAK", "MOJOKERTO", "PALANG TUBAN",
    "PASURUAN", "SINGOSARI", "TUBAN"
  ],
  "Jodipati": [
    "BLITAR", "DONOROJO", "KEDIRI", "KESAMBEN", "MAGETAN",
    "NAWANGAN", "NGANJUK", "NGAWI", "PACITAN", "PONOROGO",
    "REJOTANGAN", "SUDIMORO", "TRENGGALEK", "TULUNGAGUNG", "WIDODAREN", "WLINGI"
  ],
  "Solo Raya": [
    "BAKI", "BOYOLALI", "GEMOLONG", "GONDANGREJO", "GUNUNGKIDUL",
    "KARANGANYAR", "KARANGPANDAN", "KERJO", "KLATEN", "MASARAN",
    "PEDAN", "SIMO", "SLEMAN", "SRAGEN", "SUKOHARJO", "WEDI", "WONOGIRI"
  ],
  "Kuda Pacu": [
    "BLORA", "CEPU", "DEMAK", "GUBUG", "JEPARA",
    "KEDUNGTUBAN", "KELET", "KRAGAN", "KUDUS", "KUNDURAN",
    "LASEM", "MLONGGO", "NGAWEN", "PAMOTAN", "PATI KUNIRAN",
    "PURWODADI", "RANDUBLATUNG", "REMBANG", "WIROSARI", "WONOSALAM"
  ],
  "Panther Bersinar": [
    "BANDAR", "BATANG", "BAWANG", "BOJA", "BOJONG",
    "BREBES", "BUMIAYU", "COMAL", "PEKALONGAN", "KENDAL",
    "KERSANA BREBES", "LIMPUNG", "PEMALANG", "RANDUDONGKAL", "SLAWI", "SUKOREJO"
  ],
  "Duto Utomo": [
    "BANJARNEGARA", "BANYUMAS", "BOBOTSARI", "GRABAG", "KEMRANJEN",
    "KLAMPOK", "MAGELANG", "NGADIREJO", "PRINGSURAT", "PURBALINGGA",
    "SALATIGA", "TEMANGGUNG", "WANGON", "WONOSOBO"
  ],
  "Kujang Kencana": [
    "BAGELAN", "BANJARPATROMAN", "CILACAP MAJENANG", "CILACAP KOTA", "GARUT",
    "GOMBONG", "KEBUMEN", "KUTOARJO", "PATIMUAN", "PREMBUN",
    "PURWOREJO", "SIDAREJA", "TASIKMALAYA"
  ],
  "Pasundan Idaman": [
    "BINONG", "CIKIJING", "DARMARAJA", "INDRAMAYU", "KAB CIREBON",
    "KASOMALANG", "KOTA CIREBON", "KUNINGAN", "MAJALENGKA", "PATROL INDRAMAYU",
    "SUBANG", "SUMEDANG"
  ]
};

// ==============================================================================
// SISTEM OTENTIKASI & MANAJEMEN SESI SERVER-SIDE (OWASP CACHESERVICE TOKEN)
// ==============================================================================

/**
 * Helper Privat: Generate Cryptographically Secure Session Token & Simpan ke CacheService
 * Masa aktif sesi: 6 Jam (21.600 detik)
 */
function generateSessionToken_(userData, role) {
  var rawEntropy = Math.random() + "_" + (userData.nik || "") + "_" + new Date().getTime() + "_" + Utilities.getUuid();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawEntropy);
  var token = Utilities.getUuid() + "-" + Utilities.base64EncodeWebSafe(digest).substring(0, 32);

  var sessionPayload = {
    role: role, // "pimpinan" atau "admin"
    nik: String(userData.nik || "").trim(),
    nama: String(userData.nama || "").trim(),
    korwil: String(userData.korwil || "").trim(),
    cabang: String(userData.cabang || "").trim(),
    jabatan: String(userData.jabatan || "").trim(),
    unit: String(userData.unit || "").trim(),
    createdAt: new Date().getTime()
  };

  var cache = CacheService.getScriptCache();
  cache.put("SESSION_" + token, JSON.stringify(sessionPayload), 21600); // 6 jam

  return token;
}

/**
 * Helper Privat: Validasi Token Sesi Server & Pengecekan Otorisasi Peran (RBAC)
 */
function validateSession_(sessionToken, requiredRole) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return { valid: false, error: "Akses Ditolak: Kredensial sesi tidak ditemukan. Silakan login terlebih dahulu." };
  }

  var cache = CacheService.getScriptCache();
  var raw = cache.get("SESSION_" + sessionToken);
  if (!raw) {
    return { valid: false, error: "Sesi Anda telah kedaluwarsa atau tidak valid. Silakan masuk kembali." };
  }

  try {
    var session = JSON.parse(raw);
    if (!session || !session.role) {
      return { valid: false, error: "Data sesi korup. Silakan login kembali." };
    }

    // Role-Based Access Control
    if (requiredRole === "admin" && session.role !== "admin") {
      return { valid: false, error: "Akses Ditolak: Hak otorisasi Administrator diperlukan." };
    }

    return { valid: true, session: session };
  } catch (err) {
    return { valid: false, error: "Format sesi tidak valid." };
  }
}

/**
 * Endpoint Publik: Logout / Revokasi Token Sesi dari CacheService
 */
function logoutSessionServer(sessionToken) {
  try {
    if (sessionToken && typeof sessionToken === 'string') {
      CacheService.getScriptCache().remove("SESSION_" + sessionToken);
    }
    return { success: true };
  } catch (e) {
    return { success: true };
  }
}

/**
 * Helper: Ambil Data Master Korwil & Cabang dari Google Sheets (Sheet MasterWilayah)
 */
function getMasterWilayahData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("MasterWilayah");
    if (!sheet) {
      sheet = ss.insertSheet("MasterWilayah");
      sheet.getRange(1, 1, 1, 2).setValues([["KORWIL", "CABANG"]]);
    }

    if (sheet.getLastRow() <= 1) {
      var rows = [];
      for (var kw in DEFAULT_MASTER_WILAYAH) {
        var list = DEFAULT_MASTER_WILAYAH[kw];
        for (var i = 0; i < list.length; i++) {
          rows.push([kw, list[i]]);
        }
      }
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 2).setValues(rows);
        SpreadsheetApp.flush();
      }
      return DEFAULT_MASTER_WILAYAH;
    }

    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var map = {};
    for (var r = 0; r < values.length; r++) {
      var k = String(values[r][0] || "").trim();
      var c = String(values[r][1] || "").trim();
      if (k) {
        if (!map[k]) map[k] = [];
        if (c && map[k].indexOf(c) === -1) {
          map[k].push(c);
        }
      }
    }
    return map;
  } catch (err) {
    Logger.log("Gagal getMasterWilayahData: " + err.toString());
    return DEFAULT_MASTER_WILAYAH;
  }
}

var COL_AGENDA = {
  ID: 0,
  JUDUL: 1,
  TANGGAL: 2,
  JAM_MULAI: 3,
  JAM_SELESAI: 4,
  LOKASI: 5,
  LATITUDE: 6,
  LONGITUDE: 7,
  RADIUS: 8,
  DESKRIPSI: 9,
  STATUS: 10,
  CREATOR: 11
};

var COL_PRESENSI = {
  ID: 0,
  ID_AGENDA: 1,
  NIK: 2,
  NAMA: 3,
  KORWIL: 4,
  CABANG: 5,
  JABATAN: 6,
  STATUS: 7,
  WAKIL_NAMA: 8,
  WAKIL_JABATAN: 9,
  SIGNATURE: 10,
  TIMESTAMP: 11,
  LATITUDE: 12,
  LONGITUDE: 13,
  JARAK: 14,
  PERANGKAT: 15,
  ALASAN_IZIN: 16,
  SURAT_IZIN_URL: 17,
  FOTO_PRESENSI: 18
};

var COL_PENGATURAN = {
  KUNCI: 0,
  NILAI: 1
};

var COL_ADMIN = {
  ID: 0,
  NIK: 1,
  NAMA: 2,
  JABATAN: 3,
  PASSWORD: 4,
  STATUS: 5,
  TGL_DIBUAT: 6
};

/**
 * Helper: Mengembalikan respons berformat JSON murni untuk komunikasi REST API eksternal (Vercel)
 */
function createJsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Entry Point Web Application (GET Request)
 * Mendukung pembukaan langsung via Google Apps Script maupun health check API ping.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    var act = String(e.parameter.action).trim();
    if (act === "ping") {
      return createJsonResponse_({
        success: true,
        message: "API Google Apps Script KSP Bhina Raharja aktif dan siap melayani Vercel.",
        timestamp: new Date().toISOString()
      });
    }
    if (act === "getInitialData") {
      return createJsonResponse_(getInitialData());
    }
  }

  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("KSP Bhina Raharja - Sistem Presensi Rapat")
    .setFaviconUrl("https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
}

/**
 * Entry Point Headless REST API (POST Request)
 * Menerima request dari Frontend Vercel (atau client eksternal) dan meneruskannya ke fungsi backend yang sah.
 */
function doPost(e) {
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        requestData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }

    var action = String(requestData.action || "").trim();
    var args = Array.isArray(requestData.args) ? requestData.args : (requestData.args ? [requestData.args] : []);

    if (!action) {
      return createJsonResponse_({
        success: false,
        message: "Parameter 'action' wajib disertakan dalam request."
      });
    }

    // Whitelist fungsi publik & terproteksi yang diizinkan untuk dipanggil secara eksternal
    var ALLOWED_ACTIONS = {
      "getInitialData": true,
      "getMasterWilayahData": true,
      "getActiveAgendas": true,
      "registerPimpinan": true,
      "loginPimpinan": true,
      "loginAdmin": true,
      "logoutSessionServer": true,
      "adminChangeOwnPassword": true,
      "submitPresensi": true,
      "getAdminDashboardData": true,
      "createAgenda": true,
      "updateAgendaStatus": true,
      "getPimpinanAttendanceHistory": true,
      "uploadLogoToDrive": true,
      "saveLogoUrl": true,
      "saveMasterWilayah": true,
      "getPimpinanAccounts": true,
      "adminResetPimpinanPassword": true,
      "pimpinanUpdateNewPassword": true,
      "setAdminPimpinanStatus": true,
      "updatePimpinanProfile": true
    };

    if (!ALLOWED_ACTIONS[action]) {
      return createJsonResponse_({
        success: false,
        message: "Aksi tidak diizinkan atau tidak terdaftar: " + action
      });
    }

    // Eksekusi fungsi target dengan argumen yang dikirim
    var targetFunction = this[action];
    if (typeof targetFunction !== "function") {
      return createJsonResponse_({
        success: false,
        message: "Fungsi backend tidak ditemukan di server: " + action
      });
    }

    var result = targetFunction.apply(null, args);
    return createJsonResponse_(result);

  } catch (err) {
    return createJsonResponse_({
      success: false,
      message: "Server Execution Error: " + (err.message || err.toString())
    });
  }
}

/**
 * Endpoint: Data Inisial untuk Memuat Aplikasi Pertama Kali
 */
function getInitialData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetAgenda = ss.getSheetByName("AgendaRapim");
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    var sheetPimpinan = ss.getSheetByName("DataPimpinan");

    var activeAgendas = [];
    if (sheetAgenda && sheetAgenda.getLastRow() > 1) {
      var agendaValues = sheetAgenda.getRange(2, 1, sheetAgenda.getLastRow() - 1, sheetAgenda.getLastColumn()).getValues();
      for (var i = 0; i < agendaValues.length; i++) {
        var row = agendaValues[i];
        var st = String(row[COL_AGENDA.STATUS] || "").trim().toLowerCase();
        if (st === "aktif" || st === "active" || st === "" || st === "buka") {
          activeAgendas.push({
            id: String(row[COL_AGENDA.ID] || ""),
            judul: String(row[COL_AGENDA.JUDUL] || "Rapat Pimpinan"),
            tanggal: formatDateString(row[COL_AGENDA.TANGGAL]),
            jamMulai: String(row[COL_AGENDA.JAM_MULAI] || "09:00 WIB"),
            jamSelesai: String(row[COL_AGENDA.JAM_SELESAI] || "16:00 WIB"),
            lokasi: String(row[COL_AGENDA.LOKASI] || "Ruang Rapat Utama"),
            latitude: Number(row[COL_AGENDA.LATITUDE]) || 0,
            longitude: Number(row[COL_AGENDA.LONGITUDE]) || 0,
            radius: Number(row[COL_AGENDA.RADIUS]) || 25,
            deskripsi: String(row[COL_AGENDA.DESKRIPSI] || "")
          });
        }
      }
    }

    var appSettings = {
      namaInstansi: "Presensi Sistem Rapat Pimpinan",
      defaultRadius: 25,
      logoUrl: ""
    };

    if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
      var settingValues = sheetPengaturan.getRange(2, 1, sheetPengaturan.getLastRow() - 1, 2).getValues();
      for (var j = 0; j < settingValues.length; j++) {
        var k = String(settingValues[j][COL_PENGATURAN.KUNCI]).trim().toUpperCase();
        var v = String(settingValues[j][COL_PENGATURAN.NILAI]).trim();
        if (k === "NAMA_INSTANSI" && v) {
          if (v.toLowerCase() === "ksp bhina raharja" || v.toLowerCase() === "sistem presensi rapat") {
            appSettings.namaInstansi = "Presensi Sistem Rapat Pimpinan";
            try {
              sheetPengaturan.getRange(j + 2, COL_PENGATURAN.NILAI + 1).setValue("Presensi Sistem Rapat Pimpinan");
            } catch (setErr) {}
          } else {
            appSettings.namaInstansi = v;
          }
        }
        if (k === "DEFAULT_RADIUS" && v) appSettings.defaultRadius = Number(v) || 25;
        if (k === "LOGO_URL" && v) {
          var logoVal = v;
          // Bila tersimpan berupa URL Google Drive, server Apps Script membaca berkas langsung
          // dan mengonversinya menjadi Data URI agar 100% bebas dari blokir cookie/privasi di browser ponsel
          if (logoVal.indexOf("googleusercontent.com/d/") !== -1 || logoVal.indexOf("drive.google.com") !== -1) {
            try {
              var fIdMatch = logoVal.match(/\/d\/([a-zA-Z0-9_-]+)/) || logoVal.match(/id=([a-zA-Z0-9_-]+)/);
              if (fIdMatch && fIdMatch[1]) {
                var dFile = DriveApp.getFileById(fIdMatch[1]);
                var mime = dFile.getMimeType() || "image/png";
                var b64 = Utilities.base64Encode(dFile.getBlob().getBytes());
                logoVal = "data:" + mime + ";base64," + b64;
              }
            } catch (dErr) {
              Logger.log("Gagal convert file Drive server-side: " + dErr.toString());
            }
          }
          appSettings.logoUrl = logoVal;
        }
      }
    }

    // Ambil data master wilayah dari sheet MasterWilayah
    var masterWilayah = getMasterWilayahData();
    var listKorwil = Object.keys(masterWilayah);
    var listCabang = [];
    for (var kwKey in masterWilayah) {
      var cArr = masterWilayah[kwKey];
      for (var c = 0; c < cArr.length; c++) {
        if (listCabang.indexOf(cArr[c]) === -1) listCabang.push(cArr[c]);
      }
    }

    return {
      success: true,
      activeAgendas: activeAgendas,
      settings: appSettings,
      korwilOptions: listKorwil,
      cabangOptions: listCabang,
      masterWilayah: masterWilayah
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat data awal: " + err.toString() };
  }
}

/**
 * Endpoint Ringan: Mengambil Daftar Agenda Rapat Aktif
 * Dirancang khusus untuk pemuatan cepat & tombol 'Segarkan Agenda' di sisi pimpinan
 */
function getActiveAgendas() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetAgenda = ss.getSheetByName("AgendaRapim");
    var activeAgendas = [];

    if (sheetAgenda && sheetAgenda.getLastRow() > 1) {
      var agendaValues = sheetAgenda.getRange(2, 1, sheetAgenda.getLastRow() - 1, sheetAgenda.getLastColumn()).getValues();
      for (var i = 0; i < agendaValues.length; i++) {
        var row = agendaValues[i];
        var st = String(row[COL_AGENDA.STATUS] || "").trim().toLowerCase();
        if (st === "aktif" || st === "active" || st === "" || st === "buka") {
          activeAgendas.push({
            id: String(row[COL_AGENDA.ID] || ""),
            judul: String(row[COL_AGENDA.JUDUL] || "Rapat Pimpinan"),
            tanggal: formatDateString(row[COL_AGENDA.TANGGAL]),
            jamMulai: String(row[COL_AGENDA.JAM_MULAI] || "09:00 WIB"),
            jamSelesai: String(row[COL_AGENDA.JAM_SELESAI] || "16:00 WIB"),
            lokasi: String(row[COL_AGENDA.LOKASI] || "Ruang Rapat Utama"),
            latitude: Number(row[COL_AGENDA.LATITUDE]) || 0,
            longitude: Number(row[COL_AGENDA.LONGITUDE]) || 0,
            radius: Number(row[COL_AGENDA.RADIUS]) || 25,
            deskripsi: String(row[COL_AGENDA.DESKRIPSI] || "")
          });
        }
      }
    }

    return {
      success: true,
      activeAgendas: activeAgendas
    };
  } catch (err) {
    return {
      success: false,
      message: "Gagal memuat agenda: " + err.toString(),
      activeAgendas: []
    };
  }
}

/**
 * Endpoint: Registrasi Akun Pimpinan Mandiri
 */
function registerPimpinan(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet) throw new Error("Sheet DataPimpinan belum tersedia. Jalankan setup terlebih dahulu.");

    var nik = normalizeNik(payload.nik);
    if (!nik) return { success: false, message: "NIK wajib diisi." };

    // Validasi keunikan NIK
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (String(existingData[i][COL_PIMPINAN.NIK]).trim() === nik) {
          return { success: false, message: "NIK " + nik + " sudah terdaftar di sistem. Silakan langsung login." };
        }
      }
    }

    var idPimpinan = generateSequentialId(sheet, "PIM", COL_PIMPINAN.ID);
    var passHash = hashString(payload.password);
    var fotoUrl = payload.fotoSelfieBase64 || "";

    // Simpan foto selfie pimpinan langsung ke folder Google Drive: "Foto Profil Pimpinan Rapim"
    if (fotoUrl && fotoUrl.indexOf("data:") === 0) {
      try {
        var contentType = "image/jpeg";
        var b64Data = fotoUrl;
        if (fotoUrl.indexOf(",") !== -1) {
          var p = fotoUrl.split(",");
          var m = p[0].match(/:(.*?);/);
          if (m) contentType = m[1];
          b64Data = p[1];
        }
        var decoded = Utilities.base64Decode(b64Data);
        var cleanNama = String(payload.nama || "Pimpinan").replace(/[^a-zA-Z0-9]/g, "_");
        var fileName = "Selfie_" + nik.replace(/\./g, "") + "_" + cleanNama + ".jpg";
        var blob = Utilities.newBlob(decoded, contentType, fileName);

        var folderName = "Foto Profil Pimpinan Rapim";
        var folders = DriveApp.getFoldersByName(folderName);
        var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

        var driveFile = targetFolder.createFile(blob);
        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          Logger.log("Drive sharing restriction: " + shareErr.toString());
        }
        var fileId = driveFile.getId();
        fotoUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      } catch (driveErr) {
        Logger.log("Gagal simpan foto selfie ke Drive: " + driveErr.toString());
        // Smart Fallback: Jika ukuran data muat dalam cell Google Sheets (< 48.000 karakter), simpan data URI
        if (fotoUrl.length > 48000) {
          fotoUrl = "";
        }
      }
    }

    sheet.appendRow([
      idPimpinan,
      nik,
      String(payload.nama || "").trim(),
      String(payload.korwil || "").trim(),
      String(payload.cabang || "").trim(),
      String(payload.jabatan || "").trim(),
      String(payload.unit || "").trim(),
      passHash,
      fotoUrl,
      "Aktif",
      new Date()
    ]);

    return {
      success: true,
      message: "Registrasi berhasil! Akun Anda telah aktif. Silakan login untuk presensi.",
      idPimpinan: idPimpinan
    };
  } catch (err) {
    return { success: false, message: "Terjadi kesalahan saat pendaftaran: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Login Pimpinan
 */
function loginPimpinan(nik, password) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: "Data pimpinan belum tersedia. Silakan daftar akun terlebih dahulu." };
    }

    var cleanNik = normalizeNik(nik);
    var passHash = hashString(password);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[COL_PIMPINAN.NIK]).trim() === cleanNik) {
        if (row[COL_PIMPINAN.PASSWORD] === passHash) {
          var statusAkun = String(row[COL_PIMPINAN.STATUS] || "Aktif").trim();
          if (statusAkun.toLowerCase() === "nonaktif" || statusAkun.toLowerCase() === "tidak aktif") {
            return {
              success: false,
              message: "Akun NIK " + cleanNik + " saat ini berstatus Nonaktif. Silakan hubungi Administrator Rapim untuk aktivasi kembali."
            };
          }
          var mustReset = String(row[COL_PIMPINAN.RESET_PASS] || "").toUpperCase() === "TRUE";
          var pimpinanUser = {
            id: row[COL_PIMPINAN.ID],
            nik: row[COL_PIMPINAN.NIK],
            nama: row[COL_PIMPINAN.NAMA],
            korwil: row[COL_PIMPINAN.KORWIL],
            cabang: row[COL_PIMPINAN.CABANG],
            jabatan: row[COL_PIMPINAN.JABATAN],
            unit: row[COL_PIMPINAN.UNIT],
            foto: row[COL_PIMPINAN.FOTO],
            status: statusAkun
          };
          var sessionToken = generateSessionToken_(pimpinanUser, "pimpinan");
          return {
            success: true,
            sessionToken: sessionToken,
            mustResetPassword: mustReset,
            pimpinan: pimpinanUser
          };
        } else {
          return { success: false, message: "Kata sandi yang Anda masukkan salah." };
        }
      }
    }

    return { success: false, message: "NIK tidak ditemukan. Pastikan Anda telah melakukan registrasi akun." };
  } catch (err) {
    return { success: false, message: "Gagal login: " + err.toString() };
  }
}

/**
 * Endpoint: Login Administrator / Sekretariat
 * Mendukung Login Multi-Administrator berbasis NIK Karyawan & Password Pribadi (Sheet MasterAdmin)
 * Dilengkapi Smart Emergency Fallback ke Sheet Pengaturan.
 */
function loginAdmin(identifier, password) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cleanNik = normalizeNik(identifier);
    var passHash = hashString(password);

    // 1. Cek pada Sheet MasterAdmin (Multi-Administrator dengan NIK & Password Pribadi)
    var sheetAdmin = ss.getSheetByName("MasterAdmin");
    if (sheetAdmin && sheetAdmin.getLastRow() > 1) {
      var adminData = sheetAdmin.getRange(2, 1, sheetAdmin.getLastRow() - 1, sheetAdmin.getLastColumn()).getValues();
      for (var i = 0; i < adminData.length; i++) {
        var row = adminData[i];
        var rowNik = normalizeNik(row[COL_ADMIN.NIK]);
        var rowPass = String(row[COL_ADMIN.PASSWORD]);
        var rowStatus = String(row[COL_ADMIN.STATUS] || "Aktif");

        if (rowNik === cleanNik || String(row[COL_ADMIN.NIK]).trim() === String(identifier).trim()) {
          if (rowPass === passHash) {
            if (rowStatus !== "Aktif") {
              return { success: false, message: "Akun administrator Anda sedang dinonaktifkan." };
            }
            var adminUser = {
              id: row[COL_ADMIN.ID],
              nik: row[COL_ADMIN.NIK],
              nama: row[COL_ADMIN.NAMA],
              jabatan: row[COL_ADMIN.JABATAN]
            };
            var sessionToken = generateSessionToken_(adminUser, "admin");
            return {
              success: true,
              sessionToken: sessionToken,
              message: "Selamat datang, " + row[COL_ADMIN.NAMA] + "!",
              admin: adminUser
            };
          } else {
            return { success: false, message: "Kata sandi administrator salah." };
          }
        }
      }
    }

    // 2. Emergency Fallback ke Sheet Pengaturan (Root / Akun Cadangan)
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
      var data = sheetPengaturan.getRange(2, 1, sheetPengaturan.getLastRow() - 1, 2).getValues();
      var storedUser = "admin";
      var storedPassHash = hashString("admin123");

      for (var k = 0; k < data.length; k++) {
        if (data[k][COL_PENGATURAN.KUNCI] === "ADMIN_USER") storedUser = String(data[k][COL_PENGATURAN.NILAI]);
        if (data[k][COL_PENGATURAN.KUNCI] === "ADMIN_PASS_HASH") storedPassHash = String(data[k][COL_PENGATURAN.NILAI]);
      }

      if ((String(identifier).trim() === storedUser || cleanNik === normalizeNik(storedUser)) && passHash === storedPassHash) {
        var adminUserFallback = {
          id: "ADM-ROOT",
          nik: storedUser,
          nama: "Administrator Utama",
          jabatan: "Super Admin"
        };
        var sessionTokenFallback = generateSessionToken_(adminUserFallback, "admin");
        return {
          success: true,
          sessionToken: sessionTokenFallback,
          message: "Login Administrator Berhasil (Fallback Root)",
          admin: adminUserFallback
        };
      }
    }

    return { success: false, message: "NIK atau Password Administrator tidak ditemukan." };
  } catch (err) {
    return { success: false, message: "Gagal autentikasi admin: " + err.toString() };
  }
}

/**
 * Endpoint: Administrator Mengubah Kata Sandi Pribadinya Sendiri
 */
function adminChangeOwnPassword(nik, oldPassword, newPassword, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var cleanNik = normalizeNik(nik);
    if (!cleanNik) return { success: false, message: "NIK admin tidak valid." };
    if (!newPassword || String(newPassword).length < 6) {
      return { success: false, message: "Kata sandi baru minimal 6 karakter." };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetAdmin = ss.getSheetByName("MasterAdmin");
    if (!sheetAdmin || sheetAdmin.getLastRow() <= 1) {
      return { success: false, message: "Sheet MasterAdmin belum ditemukan. Jalankan setupDatabase terlebih dahulu." };
    }

    var data = sheetAdmin.getRange(2, 1, sheetAdmin.getLastRow() - 1, sheetAdmin.getLastColumn()).getValues();
    var oldPassHash = hashString(oldPassword);
    var newPassHash = hashString(newPassword);
    var foundIndex = -1;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (normalizeNik(row[COL_ADMIN.NIK]) === cleanNik || String(row[COL_ADMIN.NIK]).trim() === String(nik).trim()) {
        if (String(row[COL_ADMIN.PASSWORD]) !== oldPassHash) {
          return { success: false, message: "Kata sandi lama Anda salah." };
        }
        foundIndex = i + 2;
        break;
      }
    }

    if (foundIndex === -1) {
      return { success: false, message: "Akun administrator tidak ditemukan di sheet MasterAdmin." };
    }

    sheetAdmin.getRange(foundIndex, COL_ADMIN.PASSWORD + 1).setValue(newPassHash);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Kata sandi administrator berhasil diperbarui!"
    };
  } catch (err) {
    return { success: false, message: "Gagal mengubah kata sandi: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint Utama: Submit Presensi Rapim
 * - Validasi Geofencing 25 Meter Server-Side via Formula Haversine
 * - Validasi Anti-Double Presensi
 * - Penyimpanan Tanda Tangan Digital & Koordinat Audit
 */
function submitPresensi(payload) {
  var auth = validateSession_(payload ? payload.sessionToken : null, "pimpinan");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  // Enforce NIK integritas dari sesi terotentikasi (Cegah titip absen / spoofing ID)
  if (auth.session.role !== "admin") {
    payload.nik = auth.session.nik;
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPresensi = ss.getSheetByName("PresensiRapim");
    var sheetAgenda = ss.getSheetByName("AgendaRapim");

    if (!sheetPresensi || !sheetAgenda) {
      throw new Error("Struktur database belum lengkap. Jalankan setup terlebih dahulu.");
    }

    var idAgenda = String(payload.idAgenda || "").trim();
    var nik = normalizeNik(payload.nik);
    var statusHadir = String(payload.statusKehadiran || "Hadir Langsung").trim();

    if (!idAgenda || !nik) {
      return { success: false, message: "ID Agenda dan NIK wajib disertakan." };
    }

    // 1. Dapatkan Data Agenda untuk Verifikasi Lokasi & Status
    var agendaRows = sheetAgenda.getRange(2, 1, sheetAgenda.getLastRow() - 1, sheetAgenda.getLastColumn()).getValues();
    var targetAgenda = null;
    for (var a = 0; a < agendaRows.length; a++) {
      if (String(agendaRows[a][COL_AGENDA.ID]) === idAgenda) {
        targetAgenda = agendaRows[a];
        break;
      }
    }

    if (!targetAgenda) {
      return { success: false, message: "Sesi agenda rapat tidak ditemukan." };
    }

    if (targetAgenda[COL_AGENDA.STATUS] !== "Aktif") {
      return { success: false, message: "Sesi presensi untuk rapat ini telah ditutup oleh sekretariat." };
    }

    // 2. Cegah Presensi Ganda (Anti-Double Attendance)
    if (sheetPresensi.getLastRow() > 1) {
      var presensiLogs = sheetPresensi.getRange(2, 1, sheetPresensi.getLastRow() - 1, sheetPresensi.getLastColumn()).getValues();
      for (var p = 0; p < presensiLogs.length; p++) {
        var log = presensiLogs[p];
        if (String(log[COL_PRESENSI.ID_AGENDA]) === idAgenda && String(log[COL_PRESENSI.NIK]) === nik) {
          return {
            success: false,
            message: "Anda sudah melakukan presensi untuk agenda rapat ini pada " + formatDateTimeString(log[COL_PRESENSI.TIMESTAMP]) + "."
          };
        }
      }
    }

    // 3. Validasi Geofencing & Bukti Sesuai Status Kehadiran
    var venueLat = Number(targetAgenda[COL_AGENDA.LATITUDE]);
    var venueLon = Number(targetAgenda[COL_AGENDA.LONGITUDE]);
    var maxRadius = Number(targetAgenda[COL_AGENDA.RADIUS]) || 25;

    var userLat = Number(payload.userLatitude);
    var userLon = Number(payload.userLongitude);
    var distanceMeter = 0;
    var alasanIzin = "-";
    var suratIzinUrl = "";
    var fotoPresensiUrl = "";

    if (statusHadir === "Hadir Langsung") {
      if (isNaN(userLat) || isNaN(userLon) || (userLat === 0 && userLon === 0)) {
        return {
          success: false,
          message: "Akses GPS lokasi tidak terdeteksi. Harap aktifkan izin lokasi (GPS) pada perangkat Anda untuk presensi."
        };
      }

      distanceMeter = calculateHaversineDistance(userLat, userLon, venueLat, venueLon);

      // Verifikasi radius batas 25 meter
      if (distanceMeter > maxRadius) {
        return {
          success: false,
          message: "Jarak Anda saat ini adalah " + distanceMeter.toFixed(1) + " meter dari titik ruang rapat (Batas maksimal: " + maxRadius + " meter). Presensi ditolak karena Anda berada di luar area rapat."
        };
      }

      // Verifikasi Foto Selfie Kehadiran di Ruang Rapat (Anti-Titip Absen)
      var selfieRaw = payload.fotoPresensiBase64 || "";
      if (!selfieRaw || selfieRaw.length < 100) {
        return {
          success: false,
          message: "Foto selfie bukti kehadiran di ruang rapat wajib diambil."
        };
      }

      // Upload Foto Selfie ke Google Drive folder: "Foto Presensi Rapim"
      try {
        var contentType = "image/jpeg";
        var b64Data = selfieRaw;
        if (selfieRaw.indexOf(",") !== -1) {
          var p = selfieRaw.split(",");
          var m = p[0].match(/:(.*?);/);
          if (m) contentType = m[1];
          b64Data = p[1];
        }
        var decoded = Utilities.base64Decode(b64Data);
        var fileName = "PresensiHadir_" + nik.replace(/\./g, "") + "_" + idAgenda + "_" + Date.now() + ".jpg";
        var blob = Utilities.newBlob(decoded, contentType, fileName);
        var folderName = "Foto Presensi Rapim";
        var folders = DriveApp.getFoldersByName(folderName);
        var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        var driveFile = targetFolder.createFile(blob);
        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {}
        fotoPresensiUrl = "https://lh3.googleusercontent.com/d/" + driveFile.getId();
      } catch (driveErr) {
        Logger.log("Gagal simpan foto presensi ke Drive: " + driveErr.toString());
        fotoPresensiUrl = "";
      }

    } else if (statusHadir === "Izin Rapat" || statusHadir === "Izin") {
      // Izin Rapat: Bebas lokasi (Bypass limit radius)
      statusHadir = "Izin Rapat";
      if (!isNaN(userLat) && !isNaN(userLon) && userLat !== 0) {
        distanceMeter = calculateHaversineDistance(userLat, userLon, venueLat, venueLon);
      }

      alasanIzin = String(payload.alasanIzin || "Sakit").trim();
      var suratRaw = payload.suratIzinBase64 || "";

      // Validasi Berkas Surat Izin: Wajib KECUALI jika alasan "Tidak ada rapat"
      if (alasanIzin !== "Tidak ada rapat") {
        if (!suratRaw || suratRaw.length < 100) {
          return {
            success: false,
            message: "Berkas surat izin (PDF / Foto Dokumen) wajib diunggah untuk alasan " + alasanIzin + "."
          };
        }
      }

      // Upload Surat Izin ke Google Drive folder: "Surat Izin Rapim" (jika berkas dilampirkan)
      if (suratRaw && suratRaw.length >= 100) {
        try {
          var sContentType = "application/pdf";
          var sB64 = suratRaw;
          if (suratRaw.indexOf(",") !== -1) {
            var sp = suratRaw.split(",");
            var sm = sp[0].match(/:(.*?);/);
            if (sm) sContentType = sm[1];
            sB64 = sp[1];
          }
          var sDecoded = Utilities.base64Decode(sB64);
          var origName = payload.suratIzinFileName || "surat_izin.pdf";
          var sFileName = "SuratIzin_" + nik.replace(/\./g, "") + "_" + idAgenda + "_" + origName;
          var sBlob = Utilities.newBlob(sDecoded, sContentType, sFileName);
          var sFolderName = "Surat Izin Rapim";
          var sFolders = DriveApp.getFoldersByName(sFolderName);
          var sTargetFolder = sFolders.hasNext() ? sFolders.next() : DriveApp.createFolder(sFolderName);
          var sDriveFile = sTargetFolder.createFile(sBlob);
          try {
            sDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shareErr) {}
          suratIzinUrl = "https://drive.google.com/file/d/" + sDriveFile.getId() + "/view?usp=sharing";
        } catch (driveErr) {
          Logger.log("Gagal simpan surat izin ke Drive: " + driveErr.toString());
          suratIzinUrl = "";
        }
      } else {
        suratIzinUrl = "-";
      }
    }

    // 4. Validasi Tanda Tangan Digital (Wajib untuk Hadir Langsung)
    var signature = String(payload.signatureBase64 || "");
    if (statusHadir === "Hadir Langsung" && (!signature || signature.length < 50)) {
      return { success: false, message: "Goresan tanda tangan digital wajib dibubuhkan di kotak kanvas." };
    }

    // Simpan Tanda Tangan Digital ke Google Drive (Folder: "Tanda Tangan Rapim")
    var signatureUrl = "-";
    if (signature && signature.length > 50) {
      if (signature.indexOf("data:image/") === 0) {
        try {
          var sigB64 = signature;
          var sigContentType = "image/png";
          if (signature.indexOf(",") !== -1) {
            var sParts = signature.split(",");
            var sMatch = sParts[0].match(/:(.*?);/);
            if (sMatch) sigContentType = sMatch[1];
            sigB64 = sParts[1];
          }
          var sigDecoded = Utilities.base64Decode(sigB64);
          var sigFileName = "TandaTangan_" + nik.replace(/\./g, "") + "_" + idAgenda + "_" + Date.now() + ".png";
          var sigBlob = Utilities.newBlob(sigDecoded, sigContentType, sigFileName);
          var sigFolder = getOrCreateDriveFolder("Tanda Tangan Rapim");
          var sigDriveFile = sigFolder.createFile(sigBlob);
          try {
            sigDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shareErr) {}
          signatureUrl = "https://lh3.googleusercontent.com/d/" + sigDriveFile.getId();
        } catch (driveErr) {
          Logger.log("Gagal simpan tanda tangan ke Drive: " + driveErr.toString());
          // Fallback ringan jika drive bermasalah
          signatureUrl = signature.length > 1000 ? signature.substring(0, 500) : signature;
        }
      } else {
        signatureUrl = signature;
      }
    }

    // 5. Simpan Catatan Presensi
    var idPresensi = generateSequentialId(sheetPresensi, "PRS", COL_PRESENSI.ID);
    var now = new Date();

    sheetPresensi.appendRow([
      idPresensi,
      idAgenda,
      nik,
      payload.namaPimpinan || "",
      payload.korwil || "",
      payload.cabang || "",
      payload.jabatan || "",
      statusHadir,
      alasanIzin || "-",
      suratIzinUrl || "-",
      signatureUrl || "-",
      now,
      userLat || 0,
      userLon || 0,
      Number(distanceMeter.toFixed(1)),
      payload.perangkat || "Web Browser",
      alasanIzin || "-",
      suratIzinUrl || "",
      fotoPresensiUrl || ""
    ]);

    return {
      success: true,
      message: "Presensi berhasil tercatat! Terima kasih telah menghadiri agenda rapat pimpinan.",
      idPresensi: idPresensi,
      jarak: Number(distanceMeter.toFixed(1)),
      waktu: formatDateTimeString(now)
    };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan presensi: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Data Dashboard Sekretariat / Panitia
 */
function getAdminDashboardData(filterParams, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPresensi = ss.getSheetByName("PresensiRapim");
    var sheetAgenda = ss.getSheetByName("AgendaRapim");
    var sheetPimpinan = ss.getSheetByName("DataPimpinan");

    var filterAgendaId = filterParams && filterParams.idAgenda ? String(filterParams.idAgenda) : "";
    var filterKorwil = filterParams && filterParams.korwil ? String(filterParams.korwil) : "";
    var filterCabang = filterParams && filterParams.cabang ? String(filterParams.cabang) : "";
    var filterBulan = filterParams && filterParams.bulan ? String(filterParams.bulan) : "SEMUA";
    var filterTahun = filterParams && filterParams.tahun ? String(filterParams.tahun) : "SEMUA";

    // Kumpulan tahun unik untuk filter dashboard
    var yearSet = {};
    var curYear = new Date().getFullYear();
    yearSet[String(curYear)] = true;
    yearSet[String(curYear - 1)] = true;
    yearSet[String(curYear + 1)] = true;

    // Ambil semua agenda
    var allAgendas = [];
    if (sheetAgenda && sheetAgenda.getLastRow() > 1) {
      var agRows = sheetAgenda.getRange(2, 1, sheetAgenda.getLastRow() - 1, sheetAgenda.getLastColumn()).getValues();
      for (var a = 0; a < agRows.length; a++) {
        var ag = agRows[a];
        if (!ag || !ag[COL_AGENDA.ID]) continue; // Lewati baris kosong
        var agDate = ag[COL_AGENDA.TANGGAL];
        if (agDate instanceof Date && !isNaN(agDate.getTime())) {
          yearSet[String(agDate.getFullYear())] = true;
        } else if (agDate) {
          var parsedAgY = String(agDate).match(/\b(20\d\d)\b/);
          if (parsedAgY) yearSet[parsedAgY[1]] = true;
        }
        allAgendas.push({
          id: String(ag[COL_AGENDA.ID] || ""),
          judul: String(ag[COL_AGENDA.JUDUL] || ""),
          tanggal: formatDateString(ag[COL_AGENDA.TANGGAL]),
          jamMulai: String(ag[COL_AGENDA.JAM_MULAI] || ""),
          jamSelesai: String(ag[COL_AGENDA.JAM_SELESAI] || ""),
          lokasi: String(ag[COL_AGENDA.LOKASI] || ""),
          latitude: Number(ag[COL_AGENDA.LATITUDE]) || 0,
          longitude: Number(ag[COL_AGENDA.LONGITUDE]) || 0,
          radius: Number(ag[COL_AGENDA.RADIUS]) || 25,
          status: String(ag[COL_AGENDA.STATUS] || "Aktif")
        });
      }
    }

    // Peta Foto Profil & Unit Kerja Pimpinan untuk Ditampilkan di Tabel Dashboard
    var photoMap = {};
    var unitMap = {};
    var totalPimpinanTerdaftar = 0;
    if (sheetPimpinan && sheetPimpinan.getLastRow() > 1) {
      var pimRows = sheetPimpinan.getRange(2, 1, sheetPimpinan.getLastRow() - 1, sheetPimpinan.getLastColumn()).getValues();
      totalPimpinanTerdaftar = pimRows.length;
      for (var p = 0; p < pimRows.length; p++) {
        if (!pimRows[p] || !pimRows[p][COL_PIMPINAN.NIK]) continue;
        var pNik = String(pimRows[p][COL_PIMPINAN.NIK]).trim();
        var pNikClean = normalizeNik(pNik);
        var pNikDigits = pNik.replace(/\D/g, "");
        var pFoto = String(pimRows[p][COL_PIMPINAN.FOTO] || "");
        var pUnit = String(pimRows[p][COL_PIMPINAN.UNIT] || "");
        if (pFoto) {
          photoMap[pNik] = pFoto;
          photoMap[pNikClean] = pFoto;
          if (pNikDigits) photoMap[pNikDigits] = pFoto;
        }
        unitMap[pNik] = pUnit;
        unitMap[pNikClean] = pUnit;
        if (pNikDigits) unitMap[pNikDigits] = pUnit;
      }
    }

    // Ambil dan filter data presensi
    var attendanceList = [];
    var countHadirLangsung = 0;
    var countDiwakilkan = 0;
    var countIzin = 0;

    if (sheetPresensi && sheetPresensi.getLastRow() > 1) {
      var prRows = sheetPresensi.getRange(2, 1, sheetPresensi.getLastRow() - 1, sheetPresensi.getLastColumn()).getValues();
      for (var r = 0; r < prRows.length; r++) {
        var row = prRows[r];
        if (!row || !row[COL_PRESENSI.ID]) continue; // Lewati baris kosong

        var rowAgendaId = String(row[COL_PRESENSI.ID_AGENDA] || "");
        var rowKorwil = String(row[COL_PRESENSI.KORWIL] || "");
        var rowCabang = String(row[COL_PRESENSI.CABANG] || "");

        // Catat tahun dari log presensi
        var tsVal = row[COL_PRESENSI.TIMESTAMP];
        var tsDate = (tsVal instanceof Date) ? tsVal : (tsVal ? new Date(tsVal) : null);
        if (tsDate && !isNaN(tsDate.getTime())) {
          var y = String(tsDate.getFullYear());
          var m = String(tsDate.getMonth() + 1);
          yearSet[y] = true;

          // Cek filter Bulan & Tahun
          if (filterTahun && filterTahun !== "SEMUA" && y !== filterTahun) continue;
          if (filterBulan && filterBulan !== "SEMUA" && m !== filterBulan) continue;
        }

        // Cek filter Agenda, Korwil, Cabang
        if (filterAgendaId && filterAgendaId !== "SEMUA" && rowAgendaId !== filterAgendaId) continue;
        if (filterKorwil && filterKorwil !== "SEMUA" && rowKorwil !== filterKorwil) continue;
        if (filterCabang && filterCabang !== "SEMUA" && rowCabang !== filterCabang) continue;

        var status = String(row[COL_PRESENSI.STATUS] || "Hadir Langsung");
        if (status === "Hadir Langsung") countHadirLangsung++;
        else if (status === "Diwakilkan") countDiwakilkan++;
        else if (status === "Izin" || status === "Izin Rapat") countIzin++;

        var nikStr = String(row[COL_PRESENSI.NIK] || "");
        var colAlasan = row.length > COL_PRESENSI.ALASAN_IZIN ? String(row[COL_PRESENSI.ALASAN_IZIN] || "") : "";
        var colSurat = row.length > COL_PRESENSI.SURAT_IZIN_URL ? String(row[COL_PRESENSI.SURAT_IZIN_URL] || "") : "";
        var colFotoPresensi = row.length > COL_PRESENSI.FOTO_PRESENSI ? String(row[COL_PRESENSI.FOTO_PRESENSI] || "") : "";

        var alasanIzin = colAlasan || (status.indexOf("Izin") !== -1 ? String(row[COL_PRESENSI.WAKIL_NAMA] || "-") : "-");
        var suratIzinUrl = colSurat || (String(row[COL_PRESENSI.WAKIL_JABATAN]).indexOf("http") !== -1 ? String(row[COL_PRESENSI.WAKIL_JABATAN]) : "");

        var rawSig = String(row[COL_PRESENSI.SIGNATURE] || "");
        var cleanSig = rawSig;
        // Self-Healing Migration untuk Tanda Tangan Lampau yang Masih Base64 Panjang
        if (rawSig.indexOf("data:image/") === 0) {
          try {
            var b64Payload = rawSig.indexOf(",") !== -1 ? rawSig.split(",")[1] : rawSig;
            var decBytes = Utilities.base64Decode(b64Payload);
            var migFolder = getOrCreateDriveFolder("Tanda Tangan Rapim");
            var migFile = migFolder.createFile(Utilities.newBlob(decBytes, "image/png", "MigrasiSig_" + (row[COL_PRESENSI.ID] || Date.now()) + ".png"));
            try { migFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
            cleanSig = "https://lh3.googleusercontent.com/d/" + migFile.getId();
            // Perbarui sel Spreadsheet secara permanen agar di kemudian hari transfer payload super ringan
            sheetPresensi.getRange(r + 2, COL_PRESENSI.SIGNATURE + 1).setValue(cleanSig);
          } catch (migErr) {
            Logger.log("Migrasi sig error: " + migErr.toString());
            cleanSig = "";
          }
        }

        var cleanNik = normalizeNik(nikStr);
        var digitsNik = nikStr.replace(/\D/g, "");
        var rowUnit = unitMap[nikStr] || unitMap[cleanNik] || unitMap[digitsNik] || "";
        var userPhoto = photoMap[nikStr] || photoMap[cleanNik] || photoMap[digitsNik] || colFotoPresensi || "";

        attendanceList.push({
          idPresensi: String(row[COL_PRESENSI.ID] || ""),
          idAgenda: rowAgendaId,
          nik: nikStr,
          nama: String(row[COL_PRESENSI.NAMA] || ""),
          korwil: rowKorwil,
          cabang: rowCabang,
          jabatan: String(row[COL_PRESENSI.JABATAN] || ""),
          unit: rowUnit,
          status: status,
          alasanIzin: alasanIzin,
          suratIzinUrl: suratIzinUrl,
          fotoPresensi: colFotoPresensi || "",
          signature: cleanSig,
          waktu: formatDateTimeString(row[COL_PRESENSI.TIMESTAMP]),
          jarak: Number(row[COL_PRESENSI.JARAK]) || 0,
          fotoUrl: userPhoto
        });
      }
    }

    return {
      success: true,
      agendas: allAgendas,
      availableYears: Object.keys(yearSet).sort().reverse(),
      attendances: attendanceList.reverse(), // Tampilkan yang terbaru di atas
      metrics: {
        totalTerdaftar: totalPimpinanTerdaftar,
        totalPresensi: attendanceList.length,
        hadirLangsung: countHadirLangsung,
        diwakilkan: countDiwakilkan,
        izin: countIzin
      }
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat data dashboard: " + err.toString() };
  }
}

/**
 * Endpoint: Panitia Membuat Agenda Rapat Baru
 */
function createAgenda(payload) {
  var auth = validateSession_(payload ? payload.sessionToken : null, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("AgendaRapim");
    if (!sheet) throw new Error("Sheet AgendaRapim belum tersedia.");

    var idAgenda = generateSequentialId(sheet, "AGD", COL_AGENDA.ID);
    var lat = Number(payload.latitude);
    var lon = Number(payload.longitude);
    var radius = Number(payload.radius) || 25;

    sheet.appendRow([
      idAgenda,
      String(payload.judul || "").trim(),
      payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      payload.jamMulai || "09:00 WIB",
      payload.jamSelesai || "16:00 WIB",
      payload.lokasi || "Ruang Rapat Utama",
      lat,
      lon,
      radius,
      payload.deskripsi || "",
      "Aktif",
      payload.creator || "Sekretariat"
    ]);

    return { success: true, message: "Agenda rapat berhasil dibuat dengan kunci radius " + radius + " meter.", idAgenda: idAgenda };
  } catch (err) {
    return { success: false, message: "Gagal membuat agenda: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Update Status Agenda (Aktif / Selesai / Ditutup)
 */
function updateAgendaStatus(idAgenda, newStatus, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("AgendaRapim");
    if (!sheet || sheet.getLastRow() <= 1) return { success: false, message: "Agenda tidak ditemukan." };

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL_AGENDA.ID]) === String(idAgenda)) {
        sheet.getRange(i + 2, COL_AGENDA.STATUS + 1).setValue(newStatus);
        return { success: true, message: "Status agenda berhasil diperbarui menjadi: " + newStatus };
      }
    }
    return { success: false, message: "ID Agenda tidak ditemukan." };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui status agenda: " + err.toString() };
  }
}

/**
 * Endpoint: Riwayat Kehadiran Pribadi Pimpinan
 */
function getPimpinanAttendanceHistory(nik, sessionToken) {
  var auth = validateSession_(sessionToken, "pimpinan");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  // Pimpinan hanya boleh mengakses riwayat miliknya sendiri
  if (auth.session.role !== "admin") {
    nik = auth.session.nik;
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPresensi = ss.getSheetByName("PresensiRapim");
    var sheetAgenda = ss.getSheetByName("AgendaRapim");

    if (!sheetPresensi || sheetPresensi.getLastRow() <= 1) return { success: true, history: [] };

    // Peta Judul Agenda
    var agendaMap = {};
    if (sheetAgenda && sheetAgenda.getLastRow() > 1) {
      var agRows = sheetAgenda.getRange(2, 1, sheetAgenda.getLastRow() - 1, sheetAgenda.getLastColumn()).getValues();
      for (var a = 0; a < agRows.length; a++) {
        agendaMap[String(agRows[a][COL_AGENDA.ID])] = agRows[a][COL_AGENDA.JUDUL];
      }
    }

    var history = [];
    var prRows = sheetPresensi.getRange(2, 1, sheetPresensi.getLastRow() - 1, sheetPresensi.getLastColumn()).getValues();
    var cleanNik = normalizeNik(nik);

    for (var i = 0; i < prRows.length; i++) {
      var r = prRows[i];
      if (String(r[COL_PRESENSI.NIK]).trim() === cleanNik) {
        var agId = String(r[COL_PRESENSI.ID_AGENDA]);
        var st = String(r[COL_PRESENSI.STATUS]);
        var cAlasan = r.length > COL_PRESENSI.ALASAN_IZIN ? String(r[COL_PRESENSI.ALASAN_IZIN] || "") : "";
        var cSurat = r.length > COL_PRESENSI.SURAT_IZIN_URL ? String(r[COL_PRESENSI.SURAT_IZIN_URL] || "") : "";
        var als = cAlasan || (st.indexOf("Izin") !== -1 ? String(r[COL_PRESENSI.WAKIL_NAMA] || "-") : "-");
        var sUrl = cSurat || (String(r[COL_PRESENSI.WAKIL_JABATAN]).indexOf("http") !== -1 ? String(r[COL_PRESENSI.WAKIL_JABATAN]) : "");

        history.push({
          idPresensi: r[COL_PRESENSI.ID],
          judulAgenda: agendaMap[agId] || agId,
          status: st,
          alasanIzin: als,
          suratIzinUrl: sUrl,
          waktu: formatDateTimeString(r[COL_PRESENSI.TIMESTAMP]),
          jarak: r[COL_PRESENSI.JARAK],
          namaWakil: r[COL_PRESENSI.WAKIL_NAMA]
        });
      }
    }

    return { success: true, history: history.reverse() };
  } catch (err) {
    return { success: false, message: "Gagal memuat riwayat: " + err.toString() };
  }
}

/**
 * Helper: Ambil atau Buat Folder Google Drive Secara Otomatis
 */
function getOrCreateDriveFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

/**
 * Jalankan fungsi ini SATU KALI di Editor Google Apps Script (Klik tombol Jalankan / Run)
 * untuk memberikan izin otorisasi akses Google Drive (DriveApp).
 */
function authorizeDrive() {
  try {
    var targetFolder = getOrCreateDriveFolder("Logo Absensi Rapim");
    var targetFolderProfile = getOrCreateDriveFolder("Foto Profil Pimpinan Rapim");
    var targetFolderHadir = getOrCreateDriveFolder("Foto Presensi Rapim");
    var targetFolderSurat = getOrCreateDriveFolder("Surat Izin Rapim");
    var targetFolderSig = getOrCreateDriveFolder("Tanda Tangan Rapim");

    Logger.log("Otorisasi Google Drive Berhasil! 5 Folder siap: " + targetFolder.getName() + ", " + targetFolderProfile.getName() + ", " + targetFolderHadir.getName() + ", " + targetFolderSurat.getName() + ", " + targetFolderSig.getName());
    return "Otorisasi Google Drive Berhasil! Seluruh 5 folder (Logo, Foto Profil, Foto Presensi, Surat Izin, dan Tanda Tangan) siap digunakan.";
  } catch (err) {
    Logger.log("Error otorisasi: " + err.toString());
    throw err;
  }
}

/**
 * Endpoint: Upload Logo ke Google Drive via Akun Administrator
 * Dilengkapi Smart Fallback: Jika otorisasi Google Drive belum diaktifkan,
 * logo tetap otomatis tersimpan ke basis data internal tanpa memunculkan error.
 */
function uploadLogoToDrive(imageBase64, fileName, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  try {
    if (!imageBase64) return { success: false, message: "Data berkas logo tidak ditemukan." };

    var directViewUrl = "";
    var isSavedToDrive = false;

    // 1. Coba simpan ke Google Drive terlebih dahulu
    try {
      var contentType = "image/png";
      var base64Data = imageBase64;
      if (imageBase64.indexOf(",") !== -1) {
        var parts = imageBase64.split(",");
        var match = parts[0].match(/:(.*?);/);
        if (match) contentType = match[1];
        base64Data = parts[1];
      }

      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, contentType, fileName || "logo_ksp_bhina_raharja.png");

      var folderName = "Logo Absensi Rapim";
      var folders = DriveApp.getFoldersByName(folderName);
      var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

      var driveFile = targetFolder.createFile(blob);
      try {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        Logger.log("Sharing restriction notice: " + shareErr.toString());
      }

      var fileId = driveFile.getId();
      directViewUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      isSavedToDrive = true;
    } catch (driveErr) {
      Logger.log("DriveApp belum diotorisasi atau ditolak: " + driveErr.toString());
      // Smart Fallback: Jika ukuran data muat dalam cell Google Sheets (< 48.000 karakter), simpan langsung
      if (imageBase64.length < 48000) {
        directViewUrl = imageBase64;
        isSavedToDrive = false;
      } else {
        return {
          success: false,
          message: "Izin Google Drive belum diaktifkan. Buka editor Apps Script, pilih fungsi 'authorizeDrive' lalu klik Jalankan (Run) satu kali untuk memberikan izin."
        };
      }
    }

    // 2. Simpan ke sheet Pengaturan
    // Jika imageBase64 muat (< 48.000 karakter), simpan Data URI agar langsung tampil instan di semua HP & Laptop tanpa ketergantungan cookie
    var urlToPersist = (imageBase64 && imageBase64.length < 48000) ? imageBase64 : directViewUrl;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (sheetPengaturan) {
      var rows = sheetPengaturan.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        var key = String(rows[i][0]).trim().toUpperCase();
        if (key === "LOGO_URL") {
          sheetPengaturan.getRange(i + 1, 2).setValue(urlToPersist);
          found = true;
        }
      }
      if (!found) {
        sheetPengaturan.appendRow(["LOGO_URL", urlToPersist]);
      }
      SpreadsheetApp.flush(); // Komit perubahan ke disk secara instan
    }

    var successNotice = isSavedToDrive ?
      "Logo berhasil disimpan ke Google Drive (Folder: Logo Absensi Rapim) dan disinkronkan ke seluruh HP & Laptop!" :
      "Logo tersimpan di database internal dan disinkronkan ke seluruh HP & Laptop.";

    return {
      success: true,
      message: successNotice,
      logoUrl: urlToPersist
    };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan logo: " + err.toString() };
  }
}

/**
 * Endpoint: Simpan Tautan / URL Logo Eksternal atau Google Drive
 */
function saveLogoUrl(url, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  try {
    var cleanUrl = String(url || "").trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (sheetPengaturan) {
      var rows = sheetPengaturan.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === "LOGO_URL") {
          sheetPengaturan.getRange(i + 1, 2).setValue(cleanUrl);
          found = true;
          break;
        }
      }
      if (!found) {
        sheetPengaturan.appendRow(["LOGO_URL", cleanUrl]);
      }
      SpreadsheetApp.flush();
    }
    return { success: true, message: "URL Logo berhasil disimpan!", logoUrl: cleanUrl };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan URL: " + err.toString() };
  }
}

// ==============================================================================
// HELPER LOGIKA REKAYASA & FORMULA MATEMATIKA
// ==============================================================================

/**
 * Formula Haversine: Menghitung Jarak Antara Dua Titik Koordinat (Bumi) dalam Meter
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371000; // Radius bumi dalam satuan meter
  var toRad = function(degree) {
    return (degree * Math.PI) / 180;
  };

  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generator ID Unik Sekuensial Berbasis MAX (Anti-Tabrakan)
 * Format: PREFIX-YYYYMM-XXX
 */
function generateSequentialId(sheet, prefix, colIndex) {
  var now = new Date();
  var yearMonth = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMM");
  var prefixPeriod = prefix + "-" + yearMonth + "-";

  var maxSeq = 0;
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var ids = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var currentId = String(ids[i][0]);
      if (currentId.indexOf(prefixPeriod) === 0) {
        var numPart = parseInt(currentId.substring(prefixPeriod.length), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    }
  }

  var nextSeq = maxSeq + 1;
  var paddedSeq = ("000" + nextSeq).slice(-3);
  return prefixPeriod + paddedSeq;
}

/**
 * Helper Format Tanggal
 */
function formatDateString(val) {
  if (!val) return "-";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "-";
    try {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd MMM yyyy");
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Helper Format Tanggal & Jam
 */
function formatDateTimeString(val) {
  if (!val) return "-";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "-";
    try {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Helper Normalisasi Format NIK (XXXX.XX.XX)
 * Menerima angka polos 8 digit (misal: 26741212) dan mengubahnya menjadi 2674.12.12
 */
function normalizeNik(nikInput) {
  if (!nikInput) return "";
  var raw = String(nikInput).trim();
  var digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    return digits.substring(0, 4) + "." + digits.substring(4, 6) + "." + digits.substring(6, 8);
  }
  return raw;
}

/**
 * Hashing String SHA-256
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

// ==============================================================================
// FITUR BARU V1.9.0: KELOLA WILAYAH & CABANG, RESET PASSWORD PIMPINAN
// ==============================================================================

/**
 * Endpoint: Simpan Pembaruan Master Korwil & Cabang oleh Administrator
 */
function saveMasterWilayah(payload) {
  var auth = validateSession_(payload ? payload.sessionToken : null, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!payload || typeof payload !== "object") {
      return { success: false, message: "Data wilayah tidak valid." };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("MasterWilayah");
    if (!sheet) {
      sheet = ss.insertSheet("MasterWilayah");
    }

    sheet.clearContents();
    sheet.getRange(1, 1, 1, 2).setValues([["KORWIL", "CABANG"]]);

    var rows = [];
    for (var kw in payload) {
      if (kw === "sessionToken") continue;
      var cleanKw = String(kw || "").trim();
      if (!cleanKw) continue;
      var cList = payload[kw] || [];
      if (cList.length === 0) {
        rows.push([cleanKw, ""]);
      } else {
        for (var i = 0; i < cList.length; i++) {
          var cleanCb = String(cList[i] || "").trim();
          if (cleanCb) {
            rows.push([cleanKw, cleanCb]);
          }
        }
      }
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Data master Korwil & Cabang berhasil diperbarui!",
      masterWilayah: payload
    };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan wilayah: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Ambil Seluruh Akun Pimpinan untuk Dashboard Administrator
 */
function getPimpinanAccounts(sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, accounts: [] };
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var list = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      list.push({
        id: String(row[COL_PIMPINAN.ID] || ""),
        nik: String(row[COL_PIMPINAN.NIK] || ""),
        nama: String(row[COL_PIMPINAN.NAMA] || ""),
        korwil: String(row[COL_PIMPINAN.KORWIL] || ""),
        cabang: String(row[COL_PIMPINAN.CABANG] || ""),
        jabatan: String(row[COL_PIMPINAN.JABATAN] || ""),
        unit: String(row[COL_PIMPINAN.UNIT] || ""),
        foto: String(row[COL_PIMPINAN.FOTO] || ""),
        status: String(row[COL_PIMPINAN.STATUS] || "Aktif"),
        tglDaftar: formatDateString(row[COL_PIMPINAN.TGL_DAFTAR]),
        mustReset: String(row[COL_PIMPINAN.RESET_PASS] || "").toUpperCase() === "TRUE"
      });
    }

    return { success: true, accounts: list };
  } catch (err) {
    return { success: false, message: "Gagal memuat akun pimpinan: " + err.toString() };
  }
}

/**
 * Endpoint: Reset Kata Sandi Pimpinan oleh Administrator
 */
function adminResetPimpinanPassword(nik, tempPassword, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var cleanNik = normalizeNik(nik);
    if (!cleanNik) return { success: false, message: "NIK tidak valid." };
    if (!tempPassword || String(tempPassword).length < 6) {
      return { success: false, message: "Kata sandi sementara minimal 6 karakter." };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: "Data pimpinan belum tersedia." };
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var foundRow = -1;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][COL_PIMPINAN.NIK]).trim() === cleanNik) {
        foundRow = i + 2;
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Pimpinan dengan NIK " + cleanNik + " tidak ditemukan." };
    }

    var tempHash = hashString(tempPassword);
    sheet.getRange(foundRow, COL_PIMPINAN.PASSWORD + 1).setValue(tempHash);
    sheet.getRange(foundRow, COL_PIMPINAN.RESET_PASS + 1).setValue("TRUE");
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Kata sandi NIK " + cleanNik + " berhasil direset! Pimpinan wajib membuat kata sandi baru saat login berikutnya."
    };
  } catch (err) {
    return { success: false, message: "Gagal reset kata sandi: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Pimpinan Membuat Kata Sandi Baru setelah Direset Admin
 */
function pimpinanUpdateNewPassword(nik, newPassword, sessionToken) {
  var auth = validateSession_(sessionToken, "pimpinan");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  // Pimpinan hanya boleh mengubah sandi akun miliknya sendiri
  if (auth.session.role !== "admin") {
    nik = auth.session.nik;
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var cleanNik = normalizeNik(nik);
    if (!cleanNik) return { success: false, message: "NIK tidak valid." };
    if (!newPassword || String(newPassword).length < 6) {
      return { success: false, message: "Kata sandi baru minimal 6 karakter." };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: "Data pimpinan belum tersedia." };
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var foundRow = -1;
    var pimpinanData = null;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][COL_PIMPINAN.NIK]).trim() === cleanNik) {
        foundRow = i + 2;
        pimpinanData = {
          id: data[i][COL_PIMPINAN.ID],
          nik: data[i][COL_PIMPINAN.NIK],
          nama: data[i][COL_PIMPINAN.NAMA],
          korwil: data[i][COL_PIMPINAN.KORWIL],
          cabang: data[i][COL_PIMPINAN.CABANG],
          jabatan: data[i][COL_PIMPINAN.JABATAN],
          unit: data[i][COL_PIMPINAN.UNIT],
          foto: data[i][COL_PIMPINAN.FOTO]
        };
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Akun pimpinan tidak ditemukan." };
    }

    sheet.getRange(foundRow, COL_PIMPINAN.PASSWORD + 1).setValue(hashString(newPassword));
    sheet.getRange(foundRow, COL_PIMPINAN.RESET_PASS + 1).setValue("FALSE");
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Kata sandi baru Anda berhasil disimpan! Silakan lanjutkan presensi.",
      pimpinan: pimpinanData
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui kata sandi: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Mengubah Status Akun Pimpinan (Aktif / Nonaktif) oleh Administrator
 */
function setAdminPimpinanStatus(nik, newStatus, sessionToken) {
  var auth = validateSession_(sessionToken, "admin");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var cleanNik = normalizeNik(nik);
    if (!cleanNik) return { success: false, message: "NIK tidak valid." };

    var targetStatus = (String(newStatus).toLowerCase() === "nonaktif") ? "Nonaktif" : "Aktif";

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: "Sheet DataPimpinan kosong." };
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var foundRow = -1;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][COL_PIMPINAN.NIK]).trim() === cleanNik) {
        foundRow = i + 2;
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Pimpinan dengan NIK " + cleanNik + " tidak ditemukan." };
    }

    sheet.getRange(foundRow, COL_PIMPINAN.STATUS + 1).setValue(targetStatus);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Status akun NIK " + cleanNik + " berhasil diubah menjadi " + targetStatus + "."
    };
  } catch (err) {
    return { success: false, message: "Gagal mengubah status akun: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint: Pembaruan Mandiri Profil & Mutasi Penugasan Wilayah oleh Pimpinan
 * Catatan Arsitektur: Hanya memperbarui data master akun. Rekap presensi lampau di PresensiRapim tetap utuh (immutable).
 */
function updatePimpinanProfile(payload) {
  var auth = validateSession_(payload ? payload.sessionToken : null, "pimpinan");
  if (!auth.valid) {
    return { success: false, message: auth.error, sessionExpired: true };
  }

  // Pimpinan hanya boleh memperbarui profil NIK miliknya sendiri
  if (auth.session.role !== "admin") {
    payload.nik = auth.session.nik;
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!payload || !payload.nik) {
      return { success: false, message: "Data mutasi tidak lengkap." };
    }

    var cleanNik = normalizeNik(payload.nik);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DataPimpinan");
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: "Sheet DataPimpinan tidak ditemukan." };
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var foundRow = -1;
    var currentRow = null;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][COL_PIMPINAN.NIK]).trim() === cleanNik) {
        foundRow = i + 2;
        currentRow = data[i];
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Akun pimpinan NIK " + cleanNik + " tidak ditemukan." };
    }

    var statusAkun = String(currentRow[COL_PIMPINAN.STATUS] || "Aktif").trim();
    if (statusAkun.toLowerCase() === "nonaktif") {
      return { success: false, message: "Akun Anda saat ini dinonaktifkan oleh Administrator." };
    }

    var newNama = (payload.nama && String(payload.nama).trim()) ? String(payload.nama).trim() : currentRow[COL_PIMPINAN.NAMA];
    var newKorwil = (payload.korwil && String(payload.korwil).trim()) ? String(payload.korwil).trim() : currentRow[COL_PIMPINAN.KORWIL];
    var newCabang = (payload.cabang && String(payload.cabang).trim()) ? String(payload.cabang).trim() : currentRow[COL_PIMPINAN.CABANG];
    var newJabatan = (payload.jabatan && String(payload.jabatan).trim()) ? String(payload.jabatan).trim() : currentRow[COL_PIMPINAN.JABATAN];
    var newUnit = (payload.unit && String(payload.unit).trim()) ? String(payload.unit).trim() : currentRow[COL_PIMPINAN.UNIT];

    sheet.getRange(foundRow, COL_PIMPINAN.NAMA + 1).setValue(newNama);
    sheet.getRange(foundRow, COL_PIMPINAN.KORWIL + 1).setValue(newKorwil);
    sheet.getRange(foundRow, COL_PIMPINAN.CABANG + 1).setValue(newCabang);
    sheet.getRange(foundRow, COL_PIMPINAN.JABATAN + 1).setValue(newJabatan);
    sheet.getRange(foundRow, COL_PIMPINAN.UNIT + 1).setValue(newUnit);
    SpreadsheetApp.flush();

    var updatedPimpinan = {
      id: currentRow[COL_PIMPINAN.ID],
      nik: currentRow[COL_PIMPINAN.NIK],
      nama: newNama,
      korwil: newKorwil,
      cabang: newCabang,
      jabatan: newJabatan,
      unit: newUnit,
      foto: currentRow[COL_PIMPINAN.FOTO] || "",
      status: statusAkun
    };

    return {
      success: true,
      message: "Data penugasan wilayah Anda berhasil diperbarui ke " + newCabang + " (" + newKorwil + ")!",
      pimpinan: updatedPimpinan
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui profil: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}


