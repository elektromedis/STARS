-- Kategorisasi inventaris
ALTER TABLE "Alat" ADD COLUMN "kategoriInventaris" TEXT;
CREATE INDEX "Alat_kategoriInventaris_idx" ON "Alat"("kategoriInventaris");
CREATE INDEX "Alat_nomorSeri_idx" ON "Alat"("nomorSeri");
UPDATE "BarangStok" SET "jenis" = 'Sparepart' WHERE "jenis" = 'Suku cadang';
UPDATE "BarangStok" SET "jenis" = 'BHP-BMHP' WHERE "jenis" = 'BHP';
