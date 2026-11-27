-- Fase F: modul gaya ASPAK (profil/strata, standar alat, prasarana, perizinan & mutu, tenaga kesehatan)
CREATE TABLE "ProfilFaskes" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "kodeFaskes" TEXT,
  "strata" TEXT,
  "kelas" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "StandarAlat" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "strata" TEXT NOT NULL,
  "kodeRuangan" TEXT,
  "namaRuangan" TEXT NOT NULL,
  "namaAlat" TEXT NOT NULL,
  "jumlah" INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX "StandarAlat_strata_namaRuangan_namaAlat_key" ON "StandarAlat"("strata", "namaRuangan", "namaAlat");
CREATE INDEX "StandarAlat_strata_idx" ON "StandarAlat"("strata");
CREATE TABLE "PrasaranaFaskes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "jenis" TEXT NOT NULL,
  "uraian" TEXT NOT NULL,
  "ada" BOOLEAN NOT NULL DEFAULT false,
  "jumlah" REAL NOT NULL DEFAULT 0,
  "satuan" TEXT,
  "berfungsi" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "PrasaranaFaskes_jenis_uraian_key" ON "PrasaranaFaskes"("jenis", "uraian");
CREATE TABLE "IzinFaskes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kelompok" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "ada" BOOLEAN NOT NULL DEFAULT false,
  "nomor" TEXT,
  "berlakuSampai" DATETIME,
  "selamanya" BOOLEAN NOT NULL DEFAULT false,
  "catatan" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "IzinFaskes_kelompok_nama_key" ON "IzinFaskes"("kelompok", "nama");
CREATE TABLE "TenagaFaskes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "jenis" TEXT NOT NULL,
  "kelompok" TEXT,
  "jumlah" INTEGER NOT NULL DEFAULT 0,
  "strMemiliki" INTEGER NOT NULL DEFAULT 0,
  "strAktif" INTEGER NOT NULL DEFAULT 0,
  "sipMemiliki" INTEGER NOT NULL DEFAULT 0,
  "sipAktif" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "TenagaFaskes_jenis_key" ON "TenagaFaskes"("jenis");
