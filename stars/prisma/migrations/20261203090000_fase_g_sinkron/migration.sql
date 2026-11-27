-- Fase G: padanan ruangan ke ruang standar ASPAK (seperti kolom "Padanan Ruang / Pelayanan ASPAK" di TRILUX Plus)
ALTER TABLE "Ruangan" ADD COLUMN "padananAspak" TEXT;
