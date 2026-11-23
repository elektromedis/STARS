CREATE TABLE "DokumenPengetahuan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "judul" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'Pedoman',
    "halaman" INTEGER NOT NULL DEFAULT 0,
    "oleh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PotonganPengetahuan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dokumenId" INTEGER NOT NULL,
    "halaman" INTEGER NOT NULL,
    "urut" INTEGER NOT NULL,
    "teks" TEXT NOT NULL,
    CONSTRAINT "PotonganPengetahuan_dokumenId_fkey" FOREIGN KEY ("dokumenId") REFERENCES "DokumenPengetahuan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PotonganPengetahuan_dokumenId_halaman_idx" ON "PotonganPengetahuan"("dokumenId", "halaman");
