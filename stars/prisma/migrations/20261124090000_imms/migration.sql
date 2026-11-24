ALTER TABLE "PerintahKerja" ADD COLUMN "tanggapanPada" DATETIME;
ALTER TABLE "PerintahKerja" ADD COLUMN "analisis" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "pelaksana" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "perluSukuCadang" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PerintahKerja" ADD COLUMN "usulan" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "perkiraanBiaya" REAL;
ALTER TABLE "PerintahKerja" ADD COLUMN "usulanStatus" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "usulanOleh" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "usulanCatatan" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "usulanPada" DATETIME;
ALTER TABLE "PerintahKerja" ADD COLUMN "ujiFungsi" TEXT;
ALTER TABLE "PerintahKerja" ADD COLUMN "hasilInspeksi" TEXT;
CREATE TABLE "RiwayatEm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alatId" INTEGER NOT NULL,
    "fungsi" INTEGER NOT NULL,
    "aplikasi" INTEGER NOT NULL,
    "pemeliharaan" INTEGER NOT NULL,
    "riwayat" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "kerusakan" INTEGER NOT NULL,
    "intervalBulan" INTEGER,
    "sebab" TEXT NOT NULL,
    "oleh" TEXT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiwayatEm_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RiwayatEm_alatId_waktu_idx" ON "RiwayatEm"("alatId", "waktu");
