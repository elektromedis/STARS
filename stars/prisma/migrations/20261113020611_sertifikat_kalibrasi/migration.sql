-- AlterTable
ALTER TABLE "Kalibrasi" ADD COLUMN "berkas" TEXT;
ALTER TABLE "Kalibrasi" ADD COLUMN "diunggahOleh" TEXT;
ALTER TABLE "Kalibrasi" ADD COLUMN "namaBerkas" TEXT;
ALTER TABLE "Kalibrasi" ADD COLUMN "tipeBerkas" TEXT;
ALTER TABLE "Kalibrasi" ADD COLUMN "ukuranBerkas" INTEGER;

-- CreateIndex
CREATE INDEX "Kalibrasi_berkas_idx" ON "Kalibrasi"("berkas");
