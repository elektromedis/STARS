-- AlterTable
ALTER TABLE "Alat" ADD COLUMN "foto" TEXT;

-- AlterTable
ALTER TABLE "PermintaanKerja" ADD COLUMN "kodeLacak" TEXT;
ALTER TABLE "PermintaanKerja" ADD COLUMN "video" TEXT;

-- CreateTable
CREATE TABLE "DokumenAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alatId" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "namaBerkas" TEXT NOT NULL,
    "berkas" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "nomor" TEXT,
    "tanggal" DATETIME,
    "keterangan" TEXT,
    "diunggahOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DokumenAlat_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kalibrasi" (
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
    "berkas" TEXT,
    "namaBerkas" TEXT,
    "tipeBerkas" TEXT,
    "ukuranBerkas" INTEGER,
    "diunggahOleh" TEXT,
    "jenis" TEXT NOT NULL DEFAULT 'Kalibrasi',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kalibrasi_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Kalibrasi" ("alatId", "berkas", "berlakuSampai", "createdAt", "diunggahOleh", "id", "kalibrator", "keterangan", "laik", "metode", "namaBerkas", "nomorSertifikat", "petugas", "tanggal", "tipeBerkas", "ukuranBerkas") SELECT "alatId", "berkas", "berlakuSampai", "createdAt", "diunggahOleh", "id", "kalibrator", "keterangan", "laik", "metode", "namaBerkas", "nomorSertifikat", "petugas", "tanggal", "tipeBerkas", "ukuranBerkas" FROM "Kalibrasi";
DROP TABLE "Kalibrasi";
ALTER TABLE "new_Kalibrasi" RENAME TO "Kalibrasi";
CREATE INDEX "Kalibrasi_alatId_idx" ON "Kalibrasi"("alatId");
CREATE INDEX "Kalibrasi_berlakuSampai_idx" ON "Kalibrasi"("berlakuSampai");
CREATE INDEX "Kalibrasi_berkas_idx" ON "Kalibrasi"("berkas");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DokumenAlat_alatId_jenis_idx" ON "DokumenAlat"("alatId", "jenis");

-- CreateIndex
CREATE INDEX "DokumenAlat_berkas_idx" ON "DokumenAlat"("berkas");
