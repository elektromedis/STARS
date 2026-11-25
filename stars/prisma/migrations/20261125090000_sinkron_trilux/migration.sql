-- CreateTable
CREATE TABLE "SinkronTrilux" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entitas" TEXT NOT NULL,
    "idStars" INTEGER NOT NULL,
    "idTrilux" INTEGER NOT NULL,
    "asal" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SinkronTrilux_entitas_idStars_key" ON "SinkronTrilux"("entitas", "idStars");

-- CreateIndex
CREATE UNIQUE INDEX "SinkronTrilux_entitas_idTrilux_key" ON "SinkronTrilux"("entitas", "idTrilux");
