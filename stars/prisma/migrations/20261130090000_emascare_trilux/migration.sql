-- EMASCARE dari TRILUX: konfirmasi & penilaian ruangan, percakapan per laporan, permintaan alat dari ruangan
-- Prasyarat: migrasi 20261129100000_fase_b_tugas_skp (kolom rating pada PerintahKerja).
ALTER TABLE "PerintahKerja" ADD COLUMN "hasilRuangan" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "hasilRuanganOleh" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "hasilRuanganPada" DATETIME;

CREATE TABLE "PesanKeluhan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permintaanId" INTEGER NOT NULL,
    "email" TEXT,
    "nama" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PesanKeluhan_permintaanId_fkey" FOREIGN KEY ("permintaanId") REFERENCES "PermintaanKerja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PesanKeluhan_permintaanId_idx" ON "PesanKeluhan"("permintaanId");

CREATE TABLE "PermintaanAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "unitKerjaId" INTEGER,
    "ruangan" TEXT,
    "pemohon" TEXT NOT NULL,
    "emailPemohon" TEXT,
    "uraian" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Baru',
    "diputuskanOleh" TEXT,
    "diputuskanPada" DATETIME,
    "catatanKeputusan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermintaanAlat_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PermintaanAlat_nomor_key" ON "PermintaanAlat"("nomor");
CREATE INDEX "PermintaanAlat_status_idx" ON "PermintaanAlat"("status");
CREATE INDEX "PermintaanAlat_unitKerjaId_idx" ON "PermintaanAlat"("unitKerjaId");

CREATE TABLE "ItemPermintaanAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permintaanId" INTEGER NOT NULL,
    "namaAlat" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "jumlahSetuju" INTEGER,
    "jumlahTerpenuhi" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ItemPermintaanAlat_permintaanId_fkey" FOREIGN KEY ("permintaanId") REFERENCES "PermintaanAlat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ItemPermintaanAlat_permintaanId_idx" ON "ItemPermintaanAlat"("permintaanId");
