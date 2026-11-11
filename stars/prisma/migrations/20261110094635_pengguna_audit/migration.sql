-- CreateTable
CREATE TABLE "Pengguna" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sandiHash" TEXT NOT NULL,
    "peran" TEXT NOT NULL DEFAULT 'Viewer',
    "unitKerjaId" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "gagalLogin" INTEGER NOT NULL DEFAULT 0,
    "terkunciSampai" DATETIME,
    "terakhirLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pengguna_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "aksi" TEXT NOT NULL,
    "objek" TEXT,
    "detail" TEXT,
    "ip" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE INDEX "AuditLog_waktu_idx" ON "AuditLog"("waktu");
