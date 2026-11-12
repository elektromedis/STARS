-- CreateTable
CREATE TABLE "DokumenPaket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paketKode" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "namaBerkas" TEXT NOT NULL,
    "berkas" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "nomor" TEXT,
    "tanggal" DATETIME,
    "keterangan" TEXT,
    "diunggahOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DokumenPaket_berkas_key" ON "DokumenPaket"("berkas");

-- CreateIndex
CREATE INDEX "DokumenPaket_paketKode_jenis_idx" ON "DokumenPaket"("paketKode", "jenis");
