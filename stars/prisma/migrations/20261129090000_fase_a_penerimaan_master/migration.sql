-- Fase A: master rekanan/supplier/kalibrator, merk & tipe, penerimaan alat (kontrak, BAP, berkas) + kolom aset tambahan
CREATE TABLE "Rekanan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Supplier',
    "alamat" TEXT,
    "kontak" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "sertifikat" TEXT,
    "catatan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Rekanan_nama_jenis_key" ON "Rekanan"("nama", "jenis");
CREATE INDEX "Rekanan_jenis_idx" ON "Rekanan"("jenis");

CREATE TABLE "MerkAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "negara" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "MerkAlat_nama_key" ON "MerkAlat"("nama");

CREATE TABLE "TipeAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merkId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "namaAlat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TipeAlat_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "MerkAlat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TipeAlat_merkId_nama_key" ON "TipeAlat"("merkId", "nama");

CREATE TABLE "PenerimaanAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "nomorKontrak" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "nomorBap" TEXT,
    "tanggalBap" DATETIME,
    "rekananId" INTEGER,
    "tipe" TEXT NOT NULL DEFAULT 'Pembelian',
    "jenis" TEXT NOT NULL DEFAULT 'Medik',
    "nilai" REAL,
    "catatan" TEXT,
    "oleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PenerimaanAlat_rekananId_fkey" FOREIGN KEY ("rekananId") REFERENCES "Rekanan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PenerimaanAlat_nomor_key" ON "PenerimaanAlat"("nomor");
CREATE INDEX "PenerimaanAlat_tanggal_idx" ON "PenerimaanAlat"("tanggal");
CREATE INDEX "PenerimaanAlat_rekananId_idx" ON "PenerimaanAlat"("rekananId");

CREATE TABLE "BerkasPenerimaan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "penerimaanId" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Kontrak',
    "nama" TEXT NOT NULL,
    "berkas" TEXT NOT NULL,
    "ukuran" INTEGER,
    "oleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BerkasPenerimaan_penerimaanId_fkey" FOREIGN KEY ("penerimaanId") REFERENCES "PenerimaanAlat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BerkasPenerimaan_penerimaanId_idx" ON "BerkasPenerimaan"("penerimaanId");

ALTER TABLE "Alat" ADD COLUMN "noInternal" TEXT;
ALTER TABLE "Alat" ADD COLUMN "urutJenis" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "soleAgent" TEXT;
ALTER TABLE "Alat" ADD COLUMN "tanggalTerhitung" DATETIME;
ALTER TABLE "Alat" ADD COLUMN "nilaiResidu" REAL;
ALTER TABLE "Alat" ADD COLUMN "kodeSimak" TEXT;
ALTER TABLE "Alat" ADD COLUMN "kodeSimbada" TEXT;
ALTER TABLE "Alat" ADD COLUMN "penerimaanId" INTEGER REFERENCES "PenerimaanAlat" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Alat_penerimaanId_idx" ON "Alat"("penerimaanId");
CREATE INDEX "Alat_noInternal_idx" ON "Alat"("noInternal");
