-- CreateTable
CREATE TABLE "Alat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merek" TEXT,
    "model" TEXT,
    "nomorSeri" TEXT,
    "unitKerjaId" INTEGER NOT NULL,
    "lokasi" TEXT,
    "kategori" TEXT,
    "tahunPerolehan" INTEGER,
    "kondisi" TEXT NOT NULL DEFAULT 'Baik',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alat_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PermintaanKerja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "alatId" INTEGER,
    "namaAlat" TEXT NOT NULL,
    "unitKerjaId" INTEGER,
    "lokasi" TEXT,
    "pelapor" TEXT NOT NULL,
    "kontak" TEXT,
    "keluhan" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL DEFAULT 'Normal',
    "foto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Baru',
    "catatanPetugas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermintaanKerja_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PermintaanKerja_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerintahKerja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "permintaanId" INTEGER,
    "alatId" INTEGER,
    "jenis" TEXT NOT NULL DEFAULT 'Korektif',
    "deskripsi" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL DEFAULT 'Normal',
    "teknisiId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Terbuka',
    "tindakan" TEXT,
    "sukuCadang" TEXT,
    "biaya" REAL NOT NULL DEFAULT 0,
    "tanggalMulai" DATETIME,
    "tanggalSelesai" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerintahKerja_permintaanId_fkey" FOREIGN KEY ("permintaanId") REFERENCES "PermintaanKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PerintahKerja_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PerintahKerja_teknisiId_fkey" FOREIGN KEY ("teknisiId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JadwalPreventif" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alatId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "intervalHari" INTEGER NOT NULL,
    "checklist" TEXT,
    "terakhir" DATETIME,
    "berikutnya" DATETIME,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JadwalPreventif_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Alat_kode_key" ON "Alat"("kode");

-- CreateIndex
CREATE INDEX "Alat_unitKerjaId_idx" ON "Alat"("unitKerjaId");

-- CreateIndex
CREATE INDEX "Alat_kondisi_idx" ON "Alat"("kondisi");

-- CreateIndex
CREATE UNIQUE INDEX "PermintaanKerja_nomor_key" ON "PermintaanKerja"("nomor");

-- CreateIndex
CREATE INDEX "PermintaanKerja_status_idx" ON "PermintaanKerja"("status");

-- CreateIndex
CREATE INDEX "PermintaanKerja_createdAt_idx" ON "PermintaanKerja"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerintahKerja_nomor_key" ON "PerintahKerja"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "PerintahKerja_permintaanId_key" ON "PerintahKerja"("permintaanId");

-- CreateIndex
CREATE INDEX "PerintahKerja_status_idx" ON "PerintahKerja"("status");

-- CreateIndex
CREATE INDEX "PerintahKerja_teknisiId_idx" ON "PerintahKerja"("teknisiId");

-- CreateIndex
CREATE INDEX "JadwalPreventif_alatId_idx" ON "JadwalPreventif"("alatId");

-- CreateIndex
CREATE INDEX "JadwalPreventif_berikutnya_idx" ON "JadwalPreventif"("berikutnya");
