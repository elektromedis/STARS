-- CreateTable
CREATE TABLE "Ruangan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "gedung" TEXT,
    "unitKerjaId" INTEGER NOT NULL,
    "kepala" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Ruangan_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kalibrasi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alatId" INTEGER NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "kalibrator" TEXT NOT NULL,
    "petugas" TEXT,
    "metode" TEXT,
    "laik" BOOLEAN NOT NULL DEFAULT true,
    "nomorSertifikat" TEXT,
    "berlakuSampai" DATETIME,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kalibrasi_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merek" TEXT,
    "model" TEXT,
    "nomorSeri" TEXT,
    "unitKerjaId" INTEGER NOT NULL,
    "ruanganId" INTEGER,
    "lokasi" TEXT,
    "kategori" TEXT,
    "jenis" TEXT NOT NULL DEFAULT 'Medik',
    "risiko" TEXT,
    "tahunPerolehan" INTEGER,
    "hargaPerolehan" REAL,
    "usiaTeknis" INTEGER,
    "garansiSampai" DATETIME,
    "kondisi" TEXT NOT NULL DEFAULT 'Baik',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alat_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alat_ruanganId_fkey" FOREIGN KEY ("ruanganId") REFERENCES "Ruangan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alat" ("aktif", "catatan", "createdAt", "id", "kategori", "kode", "kondisi", "lokasi", "merek", "model", "nama", "nomorSeri", "tahunPerolehan", "unitKerjaId", "updatedAt") SELECT "aktif", "catatan", "createdAt", "id", "kategori", "kode", "kondisi", "lokasi", "merek", "model", "nama", "nomorSeri", "tahunPerolehan", "unitKerjaId", "updatedAt" FROM "Alat";
DROP TABLE "Alat";
ALTER TABLE "new_Alat" RENAME TO "Alat";
CREATE UNIQUE INDEX "Alat_kode_key" ON "Alat"("kode");
CREATE INDEX "Alat_unitKerjaId_idx" ON "Alat"("unitKerjaId");
CREATE INDEX "Alat_kondisi_idx" ON "Alat"("kondisi");
CREATE INDEX "Alat_jenis_idx" ON "Alat"("jenis");
CREATE TABLE "new_PerintahKerja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "permintaanId" INTEGER,
    "alatId" INTEGER,
    "jenis" TEXT NOT NULL DEFAULT 'Korektif',
    "deskripsi" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL DEFAULT 'Normal',
    "teknisiId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Terbuka',
    "checklist" TEXT,
    "tindakan" TEXT,
    "sukuCadang" TEXT,
    "biaya" REAL NOT NULL DEFAULT 0,
    "tanggalMulai" DATETIME,
    "tanggalSelesai" DATETIME,
    "jadwalId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerintahKerja_permintaanId_fkey" FOREIGN KEY ("permintaanId") REFERENCES "PermintaanKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PerintahKerja_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PerintahKerja_teknisiId_fkey" FOREIGN KEY ("teknisiId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PerintahKerja_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "JadwalPreventif" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PerintahKerja" ("alatId", "biaya", "createdAt", "deskripsi", "id", "jenis", "nomor", "permintaanId", "prioritas", "status", "sukuCadang", "tanggalMulai", "tanggalSelesai", "teknisiId", "tindakan", "updatedAt") SELECT "alatId", "biaya", "createdAt", "deskripsi", "id", "jenis", "nomor", "permintaanId", "prioritas", "status", "sukuCadang", "tanggalMulai", "tanggalSelesai", "teknisiId", "tindakan", "updatedAt" FROM "PerintahKerja";
DROP TABLE "PerintahKerja";
ALTER TABLE "new_PerintahKerja" RENAME TO "PerintahKerja";
CREATE UNIQUE INDEX "PerintahKerja_nomor_key" ON "PerintahKerja"("nomor");
CREATE UNIQUE INDEX "PerintahKerja_permintaanId_key" ON "PerintahKerja"("permintaanId");
CREATE INDEX "PerintahKerja_status_idx" ON "PerintahKerja"("status");
CREATE INDEX "PerintahKerja_teknisiId_idx" ON "PerintahKerja"("teknisiId");
CREATE INDEX "PerintahKerja_jadwalId_idx" ON "PerintahKerja"("jadwalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Ruangan_unitKerjaId_idx" ON "Ruangan"("unitKerjaId");

-- CreateIndex
CREATE UNIQUE INDEX "Ruangan_nama_unitKerjaId_key" ON "Ruangan"("nama", "unitKerjaId");

-- CreateIndex
CREATE INDEX "Kalibrasi_alatId_idx" ON "Kalibrasi"("alatId");

-- CreateIndex
CREATE INDEX "Kalibrasi_berlakuSampai_idx" ON "Kalibrasi"("berlakuSampai");
