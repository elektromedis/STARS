-- Registrasi mandiri (menunggu persetujuan Admin) & token lupa sandi.
ALTER TABLE "Pengguna" ADD COLUMN "menunggu" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pengguna" ADD COLUMN "catatanDaftar" TEXT;

CREATE TABLE "TokenSandi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "penggunaId" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "kedaluwarsa" DATETIME NOT NULL,
    "dipakai" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenSandi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TokenSandi_hash_key" ON "TokenSandi"("hash");
CREATE INDEX "TokenSandi_penggunaId_idx" ON "TokenSandi"("penggunaId");
