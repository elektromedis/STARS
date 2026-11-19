ALTER TABLE "Pengguna" ADD COLUMN "tokenKalender" TEXT;
CREATE UNIQUE INDEX "Pengguna_tokenKalender_key" ON "Pengguna"("tokenKalender");

CREATE TABLE "Peminjaman" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "alatId" INTEGER NOT NULL,
    "dariUnitId" INTEGER NOT NULL,
    "keUnitId" INTEGER NOT NULL,
    "peminjam" TEXT NOT NULL,
    "pemohonEmail" TEXT,
    "keperluan" TEXT NOT NULL,
    "tanggalPinjam" DATETIME NOT NULL,
    "rencanaKembali" DATETIME NOT NULL,
    "tanggalKembali" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Diajukan',
    "kondisiKembali" TEXT,
    "catatan" TEXT,
    "rfidTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Peminjaman_nomor_key" ON "Peminjaman"("nomor");
CREATE INDEX "Peminjaman_status_idx" ON "Peminjaman"("status");
CREATE INDEX "Peminjaman_alatId_idx" ON "Peminjaman"("alatId");
