-- CreateTable
CREATE TABLE "LokasiPantau" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Kulkas',
    "deskripsi" TEXT,
    "unitKerjaId" INTEGER,
    "alatId" INTEGER,
    "suhuMin" REAL,
    "suhuMaks" REAL,
    "lembapMin" REAL,
    "lembapMaks" REAL,
    "tundaAlarm" INTEGER NOT NULL DEFAULT 2,
    "batasPutusMenit" INTEGER NOT NULL DEFAULT 15,
    "penanggungJawab" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "terakhirWaktu" DATETIME,
    "terakhirSuhu" REAL,
    "terakhirLembap" REAL,
    "dibuatOleh" TEXT,
    "diubahOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LokasiPantau_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LokasiPantau_alatId_fkey" FOREIGN KEY ("alatId") REFERENCES "Alat" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SensorIot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serial" TEXT NOT NULL,
    "nama" TEXT,
    "model" TEXT,
    "lokasiId" INTEGER,
    "tokenHash" TEXT,
    "tokenPetunjuk" TEXT,
    "terakhirTerhubung" DATETIME,
    "baterai" REAL,
    "sinyal" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatOleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SensorIot_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "LokasiPantau" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BacaanSensor" (
    "lokasiId" INTEGER NOT NULL,
    "waktu" DATETIME NOT NULL,
    "suhu" REAL,
    "lembap" REAL,
    "serial" TEXT,
    "sumber" TEXT NOT NULL DEFAULT 'api',

    PRIMARY KEY ("lokasiId", "waktu"),
    CONSTRAINT "BacaanSensor_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "LokasiPantau" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlarmPantau" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lokasiId" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "mulai" DATETIME NOT NULL,
    "selesai" DATETIME,
    "puncak" REAL,
    "batas" REAL,
    "diakuiOleh" TEXT,
    "diakuiPada" DATETIME,
    "tindakan" TEXT,
    "dampak" TEXT,
    "pencegahan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlarmPantau_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "LokasiPantau" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspeksiPantau" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lokasiId" INTEGER NOT NULL,
    "tanggal" TEXT NOT NULL,
    "sesi" TEXT NOT NULL,
    "suhu" REAL,
    "lembap" REAL,
    "waktuBaca" DATETIME,
    "oleh" TEXT NOT NULL,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspeksiPantau_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "LokasiPantau" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LokasiPantau_kode_key" ON "LokasiPantau"("kode");

-- CreateIndex
CREATE INDEX "LokasiPantau_unitKerjaId_idx" ON "LokasiPantau"("unitKerjaId");

-- CreateIndex
CREATE UNIQUE INDEX "SensorIot_serial_key" ON "SensorIot"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "SensorIot_lokasiId_key" ON "SensorIot"("lokasiId");

-- CreateIndex
CREATE UNIQUE INDEX "SensorIot_tokenHash_key" ON "SensorIot"("tokenHash");

-- CreateIndex
CREATE INDEX "AlarmPantau_lokasiId_mulai_idx" ON "AlarmPantau"("lokasiId", "mulai");

-- CreateIndex
CREATE INDEX "AlarmPantau_selesai_idx" ON "AlarmPantau"("selesai");

-- CreateIndex
CREATE UNIQUE INDEX "InspeksiPantau_lokasiId_tanggal_sesi_key" ON "InspeksiPantau"("lokasiId", "tanggal", "sesi");

