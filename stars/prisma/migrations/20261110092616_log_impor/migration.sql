-- CreateTable
CREATE TABLE "LogImpor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "namaBerkas" TEXT NOT NULL,
    "ukuranByte" INTEGER NOT NULL,
    "pengguna" TEXT,
    "totalBaris" INTEGER NOT NULL,
    "barisBaru" INTEGER NOT NULL,
    "barisDiperbarui" INTEGER NOT NULL,
    "barisError" INTEGER NOT NULL DEFAULT 0,
    "totalNilai" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "pesan" TEXT,
    "berkasTersimpan" TEXT
);
