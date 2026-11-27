-- Fase I: perencanaan pengadaan (usulan → verifikasi/nominasi → pagu), inflasi tahunan untuk depresiasi
CREATE TABLE "PaguBelanja" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tahun" INTEGER NOT NULL,
  "sumberDana" TEXT NOT NULL,
  "nilai" REAL NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "PaguBelanja_tahun_sumberDana_key" ON "PaguBelanja"("tahun", "sumberDana");
CREATE TABLE "InflasiTahun" (
  "tahun" INTEGER NOT NULL PRIMARY KEY,
  "persen" REAL NOT NULL
);
CREATE TABLE "UsulanPengadaan" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tahun" INTEGER NOT NULL,
  "unitKerjaId" INTEGER,
  "ruangan" TEXT,
  "namaAlat" TEXT NOT NULL,
  "sifat" TEXT NOT NULL DEFAULT 'Baru',
  "jumlah" INTEGER NOT NULL DEFAULT 1,
  "hargaSatuan" REAL NOT NULL DEFAULT 0,
  "gantiUsia" INTEGER,
  "gantiKondisi" TEXT,
  "alasan" TEXT,
  "pengusul" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Diajukan',
  "jumlahSetuju" INTEGER,
  "verifikator" TEXT,
  "verifikasiPada" DATETIME,
  "catatan" TEXT,
  "skorUrgensi" INTEGER,
  "skorExisting" INTEGER,
  "skorPeruntukan" INTEGER,
  "kabidUrgensi" INTEGER,
  "kabidExisting" INTEGER,
  "kabidPeruntukan" INTEGER,
  "sesuaiIndikator" BOOLEAN NOT NULL DEFAULT false,
  "sesuaiProgram" BOOLEAN NOT NULL DEFAULT false,
  "sesuaiAspak" BOOLEAN NOT NULL DEFAULT false,
  "sesuaiLegal" BOOLEAN NOT NULL DEFAULT false,
  "skorFinal" REAL,
  "masukPagu" BOOLEAN NOT NULL DEFAULT false,
  "sumberDana" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UsulanPengadaan_tahun_status_idx" ON "UsulanPengadaan"("tahun", "status");
CREATE INDEX "UsulanPengadaan_unitKerjaId_idx" ON "UsulanPengadaan"("unitKerjaId");
