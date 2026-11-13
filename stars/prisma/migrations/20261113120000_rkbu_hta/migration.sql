-- CreateTable
CREATE TABLE "DokumenRkbu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "judul" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Pemeliharaan',
    "tahun" INTEGER NOT NULL,
    "tahap" TEXT NOT NULL,
    "unit" TEXT,
    "jumlahBaris" INTEGER NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "isi" TEXT NOT NULL,
    "dibuatOleh" TEXT,
    "diubahOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProdukHta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kunci" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merek" TEXT,
    "model" TEXT,
    "harga" REAL,
    "garansiBulan" INTEGER,
    "usiaTeknis" INTEGER,
    "tkdn" REAL,
    "akl" TEXT,
    "asal" TEXT,
    "penyedia" TEXT,
    "tautan" TEXT,
    "spesifikasi" TEXT,
    "catatan" TEXT,
    "foto" TEXT,
    "dibuatOleh" TEXT,
    "diubahOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DokumenRkbu_tahun_tahap_idx" ON "DokumenRkbu"("tahun", "tahap");

-- CreateIndex
CREATE UNIQUE INDEX "ProdukHta_kunci_key" ON "ProdukHta"("kunci");
