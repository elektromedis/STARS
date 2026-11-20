-- CreateTable
CREATE TABLE "ItemSitus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jenis" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "judulEn" TEXT,
    "gambar" TEXT,
    "tautan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ItemSitus_jenis_aktif_idx" ON "ItemSitus"("jenis", "aktif");
