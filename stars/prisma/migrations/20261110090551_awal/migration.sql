-- CreateTable
CREATE TABLE "UnitKerja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "urut" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Paket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tahap" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "sumberDana" TEXT NOT NULL DEFAULT 'BLUD',
    "namaRekening" TEXT NOT NULL,
    "namaPaket" TEXT NOT NULL,
    "uraian" TEXT,
    "unitKerjaId" INTEGER NOT NULL,
    "lokasiAsli" TEXT,
    "kodeBarang" TEXT,
    "vol1" REAL NOT NULL DEFAULT 1,
    "satuan1" TEXT,
    "vol2" REAL NOT NULL DEFAULT 1,
    "satuan2" TEXT,
    "hargaSatuan" REAL NOT NULL,
    "nilai" REAL NOT NULL,
    "serapan" BOOLEAN NOT NULL DEFAULT false,
    "prioritas" TEXT,
    "linkHarga" TEXT,
    "keterangan" TEXT,
    "kategori" TEXT NOT NULL DEFAULT 'Pemeliharaan Lainnya',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Paket_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitKerja_nama_key" ON "UnitKerja"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Paket_kode_key" ON "Paket"("kode");

-- CreateIndex
CREATE INDEX "Paket_tahun_tahap_idx" ON "Paket"("tahun", "tahap");

-- CreateIndex
CREATE INDEX "Paket_unitKerjaId_idx" ON "Paket"("unitKerjaId");

-- CreateIndex
CREATE INDEX "Paket_kategori_idx" ON "Paket"("kategori");
