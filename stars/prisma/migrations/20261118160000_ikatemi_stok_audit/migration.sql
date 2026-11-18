-- Klasifikasi IKATEMI pada Alat
ALTER TABLE "Alat" ADD COLUMN "ikatemiNama" TEXT;
ALTER TABLE "Alat" ADD COLUMN "ikatemiFungsi" TEXT;
ALTER TABLE "Alat" ADD COLUMN "ikatemiTeknologi" TEXT;
ALTER TABLE "Alat" ADD COLUMN "ikatemiRisiko" TEXT;

-- Stok suku cadang, BHP, alat kerja & alat uji
CREATE TABLE "BarangStok" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "stok" INTEGER NOT NULL DEFAULT 0,
    "stokMinimum" INTEGER NOT NULL DEFAULT 0,
    "lokasi" TEXT,
    "nomorLot" TEXT,
    "kedaluwarsa" DATETIME,
    "kalibrasiSampai" DATETIME,
    "harga" REAL,
    "alatTerkait" TEXT,
    "pemasok" TEXT,
    "catatan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "BarangStok_kode_key" ON "BarangStok"("kode");
CREATE INDEX "BarangStok_jenis_idx" ON "BarangStok"("jenis");

CREATE TABLE "MutasiStok" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barangId" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "stokSetelah" INTEGER NOT NULL,
    "keterangan" TEXT,
    "oleh" TEXT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MutasiStok_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "BarangStok" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MutasiStok_barangId_waktu_idx" ON "MutasiStok"("barangId", "waktu");

-- Audit inventaris tahunan
CREATE TABLE "AuditInventaris" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tahun" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Berjalan',
    "dibuatOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selesaiPada" DATETIME
);

CREATE TABLE "AuditItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditId" INTEGER NOT NULL,
    "alatId" INTEGER NOT NULL,
    "ditemukan" BOOLEAN NOT NULL,
    "kondisiSesuai" BOOLEAN NOT NULL DEFAULT true,
    "lokasiSesuai" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "oleh" TEXT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditInventaris" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditItem_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuditItem_auditId_alatId_key" ON "AuditItem"("auditId", "alatId");
