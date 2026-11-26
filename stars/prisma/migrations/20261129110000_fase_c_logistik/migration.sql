-- Fase C: alur logistik mutasi (penjemputan, penggudangan, pengembalian) + tautan ke penghapusan
ALTER TABLE "MutasiAlat" ADD COLUMN "dijemputOleh" TEXT;
ALTER TABLE "MutasiAlat" ADD COLUMN "dijemputPada" DATETIME;
ALTER TABLE "MutasiAlat" ADD COLUMN "gudang" TEXT;
ALTER TABLE "MutasiAlat" ADD COLUMN "nomorPenghapusan" TEXT;
