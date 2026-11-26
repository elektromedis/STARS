-- Fase B: master tugas & SKP (Sistem Kredit Poin), jadwal massal (tugasId), rating & persetujuan perintah kerja
CREATE TABLE "Skp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "poin" REAL NOT NULL DEFAULT 0,
    "uraian" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Skp_kode_key" ON "Skp"("kode");

CREATE TABLE "MasterTugas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Preventif',
    "durasiMenit" INTEGER NOT NULL DEFAULT 60,
    "periodeHari" INTEGER NOT NULL DEFAULT 90,
    "biaya" REAL NOT NULL DEFAULT 0,
    "kritis" BOOLEAN NOT NULL DEFAULT false,
    "kataKunci" TEXT,
    "checklist" TEXT,
    "sukuCadang" TEXT,
    "skpId" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MasterTugas_skpId_fkey" FOREIGN KEY ("skpId") REFERENCES "Skp" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MasterTugas_nama_key" ON "MasterTugas"("nama");
CREATE INDEX "MasterTugas_jenis_idx" ON "MasterTugas"("jenis");

ALTER TABLE "JadwalPreventif" ADD COLUMN "tugasId" INTEGER REFERENCES "MasterTugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "JadwalPreventif_tugasId_idx" ON "JadwalPreventif"("tugasId");

ALTER TABLE "PerintahKerja" ADD COLUMN "rating" INTEGER;
ALTER TABLE "PerintahKerja" ADD COLUMN "ratingCatatan" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "ratingOleh" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "ratingPada" DATETIME;
ALTER TABLE "PerintahKerja" ADD COLUMN "disetujuiOleh" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "disetujuiPada" DATETIME;
