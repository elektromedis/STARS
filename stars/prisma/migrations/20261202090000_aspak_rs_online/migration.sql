-- ASPAK & SIRS RS Online (snapshot data, diunggah lewat Admin)
CREATE TABLE "AspakKode" (
    "kode" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "kelompok" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AspakRuang" (
    "kode" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "unitKerjaId" INTEGER,
    "terverifikasi" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AspakRuang_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AspakRuang_nama_key" ON "AspakRuang"("nama");
CREATE TABLE "AspakInventaris" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "namaAlat" TEXT NOT NULL,
    "kodeAspak" TEXT,
    "ruangKode" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "rusak" INTEGER NOT NULL DEFAULT 0,
    "sumber" TEXT NOT NULL DEFAULT 'SIRS RS Online',
    "snapshot" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AspakInventaris_kodeAspak_idx" ON "AspakInventaris"("kodeAspak");
CREATE INDEX "AspakInventaris_ruangKode_idx" ON "AspakInventaris"("ruangKode");
CREATE INDEX "AspakInventaris_snapshot_idx" ON "AspakInventaris"("snapshot");
CREATE TABLE "KompetensiRs" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "strataRs" TEXT NOT NULL
);
CREATE TABLE "SyaratKompetensi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kompetensiId" INTEGER NOT NULL,
    "strata" TEXT NOT NULL,
    "kodeAspak" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kelompok" TEXT,
    "status" TEXT NOT NULL,
    "grup" TEXT NOT NULL,
    "jumlahRs" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SyaratKompetensi_kompetensiId_fkey" FOREIGN KEY ("kompetensiId") REFERENCES "KompetensiRs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SyaratKompetensi_kompetensiId_strata_grup_idx" ON "SyaratKompetensi"("kompetensiId", "strata", "grup");
CREATE INDEX "SyaratKompetensi_kodeAspak_idx" ON "SyaratKompetensi"("kodeAspak");
