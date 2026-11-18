-- Skor risiko inklusi WHO (EM Fennigkoh-Smith & EMR Wang-Levenson)
ALTER TABLE "Alat" ADD COLUMN "emFungsi" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "emRisiko" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "emPemeliharaan" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "emrMisiKritis" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "emrUtilisasi" INTEGER;
ALTER TABLE "Alat" ADD COLUMN "emDinilaiPada" DATETIME;
