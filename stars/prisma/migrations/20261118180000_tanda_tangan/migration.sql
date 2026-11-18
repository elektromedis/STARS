CREATE TABLE "TandaTangan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "dokumen" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "identitas" TEXT,
    "hashIsi" TEXT NOT NULL,
    "ip" TEXT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TandaTangan_token_key" ON "TandaTangan"("token");
CREATE UNIQUE INDEX "TandaTangan_nomor_peran_key" ON "TandaTangan"("nomor", "peran");
CREATE INDEX "TandaTangan_nomor_idx" ON "TandaTangan"("nomor");
