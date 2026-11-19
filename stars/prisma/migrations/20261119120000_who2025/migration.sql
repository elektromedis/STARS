ALTER TABLE "Alat" ADD COLUMN "emdnKode" TEXT;
ALTER TABLE "Alat" ADD COLUMN "gmdnKode" TEXT;
ALTER TABLE "Alat" ADD COLUMN "udi" TEXT;
ALTER TABLE "Alat" ADD COLUMN "dayaWatt" REAL;
ALTER TABLE "Alat" ADD COLUMN "kategoriLimbah" TEXT;
CREATE TABLE "Penghapusan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "alatId" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "keterangan" TEXT,
    "dekontaminasi" BOOLEAN NOT NULL DEFAULT false,
    "dataDihapus" BOOLEAN NOT NULL DEFAULT false,
    "tujuan" TEXT NOT NULL,
    "kategoriLimbah" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Diajukan',
    "pengusul" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Penghapusan_nomor_key" ON "Penghapusan"("nomor");
CREATE INDEX "Penghapusan_alatId_idx" ON "Penghapusan"("alatId");
