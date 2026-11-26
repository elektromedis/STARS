-- Relokasi & mutasi alat
CREATE TABLE "MutasiAlat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomor" TEXT NOT NULL,
    "alatId" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "dariUnitId" INTEGER NOT NULL,
    "dariUnit" TEXT NOT NULL,
    "dariRuanganId" INTEGER,
    "dariRuangan" TEXT,
    "keUnitId" INTEGER NOT NULL,
    "keUnit" TEXT NOT NULL,
    "keRuanganId" INTEGER,
    "keRuangan" TEXT,
    "alasan" TEXT NOT NULL,
    "kondisi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Diajukan',
    "diajukanOleh" TEXT,
    "diputuskanOleh" TEXT,
    "diputuskanPada" DATETIME,
    "catatanKeputusan" TEXT,
    "diterimaOleh" TEXT,
    "diterimaPada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MutasiAlat_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MutasiAlat_nomor_key" ON "MutasiAlat"("nomor");
CREATE INDEX "MutasiAlat_alatId_idx" ON "MutasiAlat"("alatId");
CREATE INDEX "MutasiAlat_status_idx" ON "MutasiAlat"("status");
