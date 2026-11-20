-- CreateTable
CREATE TABLE "TemplateLembarKerja" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "nama" TEXT NOT NULL, "kataKunci" TEXT, "halaman" INTEGER, "kualitatif" TEXT NOT NULL, "kuantitatif" TEXT NOT NULL, "preventif" TEXT NOT NULL, "lengkap" BOOLEAN NOT NULL DEFAULT false, "aktif" BOOLEAN NOT NULL DEFAULT true, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "TemplateLembarKerja_nama_key" ON "TemplateLembarKerja"("nama");
CREATE TABLE "LembarKerja" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "nomor" TEXT NOT NULL, "kegiatan" TEXT NOT NULL, "tipeInspeksi" TEXT NOT NULL DEFAULT 'Terjadwal', "alatId" INTEGER NOT NULL, "template" TEXT, "tanggal" DATETIME NOT NULL, "hasil" TEXT NOT NULL, "perhatian" TEXT, "data" TEXT NOT NULL, "catatan" TEXT, "status" TEXT NOT NULL DEFAULT 'Draf', "pemeriksa" TEXT NOT NULL, "emailPemeriksa" TEXT, "alasanTolak" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "LembarKerja_nomor_key" ON "LembarKerja"("nomor");
CREATE INDEX "LembarKerja_alatId_idx" ON "LembarKerja"("alatId");
CREATE INDEX "LembarKerja_kegiatan_status_idx" ON "LembarKerja"("kegiatan", "status");
CREATE TABLE "KegiatanPromotif" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "tanggal" DATETIME NOT NULL, "alatId" INTEGER, "namaAlat" TEXT NOT NULL, "unit" TEXT, "materi" TEXT NOT NULL, "pemateri" TEXT NOT NULL, "peserta" INTEGER NOT NULL DEFAULT 0, "catatan" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);

-- Data awal: 114 jenis alat (Pedoman Pengoperasian dan Pemeliharaan Peralatan Kesehatan, Kemenkes 2021, Bab IV)

INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ABI (Ankle Brachial Index)','ABI',25,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ablasi','Ablasi',28,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ABPM (Ambulatory Blood Pressure Monitor)','ABPM',32,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ACT (Automatic Coagulation Timer)','ACT',35,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('AED (Automated External Defibrillator)','AED',38,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Agitator','Agitator',41,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Aggregometer','Aggregometer',44,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Angiography X-Ray System','Angiography X-Ray System',46,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Angiojet Ultra','Angiojet Ultra',49,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Autoclave / Steam Sterilizer','Autoclave',51,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Automatic CPR','Automatic CPR',54,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Autotransfusion','Autotransfusion',58,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Baby Incubator','Baby Incubator',61,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Baby Incubator Transport','Baby Incubator Transport',65,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Baby Resuscitator','Baby Resuscitator',70,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Bed Anti Decubitus','Bed Anti Decubitus',73,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Bed Side Monitor','Bed Side Monitor',76,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Billy Blanket','Billy Blanket',79,'Chassis/Housing
AC Plug
Line Cord
Strain Reliefs
Fiberoptic Pads
Fiberoptic Cable Connector','Ground Resistance | ≤0,5 Ω','Clean exterior and accessories',1);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Biometry','Biometry',81,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Blanket Warmer','Blanket Warmer',84,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Blood Bank','Blood Bank',87,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Blood Gas Analyzer','Blood Gas Analyzer',90,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Blood Solution Warmer','Blood Solution Warmer',93,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Cardio Dynamic','Cardio Dynamic',96,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Cardio Output','Cardio Output',99,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Cardioblade','Cardioblade',101,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Cardiotocograph (CTG)','Cardiotocograph, CTG',104,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Central Monitor','Central Monitor',107,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Centrifuge','Centrifuge',110,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Centrimag Console','Centrimag Console',113,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Chart Projector','Chart Projector',116,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Chemistry Autoanalyzer','Chemistry Autoanalyzer',119,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Computed Radiography System','Computed Radiography System',121,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('CPAP (Continuous Positive Airway Pressure)','CPAP',124,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('CRRT (Continuous Renal Replacement Therapy)','CRRT',127,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('CT-Scan','CT-Scan',130,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Defibrillator','Defibrillator',133,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Delivery Nitric Oxide','Delivery Nitric Oxide',136,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Digital Radiography System','Digital Radiography System',139,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Doppler','Doppler',143,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ECG Holter','ECG Holter',146,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electroencephalograph (EEG)','Electroencephalograph, EEG',149,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electro Stimulator','Electro Stimulator',154,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electro Surgery Unit (ESU)','Electro Surgery Unit, ESU',157,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electrocardiograph (ECG)','Electrocardiograph, ECG',160,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electrolyte Analyzer','Electrolyte Analyzer',163,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Electromyograph (EMG)','Electromyograph, EMG',166,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Endoscopy Unit','Endoscopy Unit',169,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ENT Set (Ear Nose And Throat)','ENT Set',173,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Flow Meter Blood','Flow Meter Blood',176,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Fluid Warmer','Fluid Warmer',179,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Gamma Camera','Gamma Camera',182,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hematology Analyzer','Hematology Analyzer',185,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hemodialisa Unit','Hemodialisa Unit',188,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hemostatis','Hemostatis',192,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hot Plate Laboratory','Hot Plate Laboratory',195,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hydrotubator','Hydrotubator',198,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Hypo Hypertermia Machine','Hypo Hypertermia Machine',202,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('IABP (Intra Arterial Balloon Pump)','IABP',206,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('ICG (Impedance Cardiograph)','ICG',210,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Incubator CO2','Incubator CO2',214,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Incubator Lab','Incubator Lab',217,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Infant Warmer','Infant Warmer',220,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Infusion Pump','Infusion Pump',223,'Body/Chasing
Power Supply
Pole Clamp
Battery Pack
Display
Control Key Pad
Self Test
Program Menu
System Setup
Compatibility infusion Set
Pluger
Door Oper & Close Function','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Pembersihan eksterior/luar alat
Pengecekan sensor
Cek fungsi sistem
Replace',1);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Injector','Injector',226,'Body/Fisik
Main Power/Switch Power
Display
Timing bols
Program Power Head
Heater Blanked
Flow Knop
Ceiling Mount','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',1);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Laminar Flow Cabinet','Laminar Flow Cabinet',229,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Lampu Operasi','Lampu Operasi',231,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Lampu Operasi Bergerak/Mobile','Lampu Operasi Bergerak',233,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Laparoscopy Unit','Laparoscopy Unit',235,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Linear Accelerator (LINAC)','Linear Accelerator, LINAC',238,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Meja Ginekologi','Meja Ginekologi',241,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Meja Operasi','Meja Operasi',243,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Mesin Anestesi','Mesin Anestesi',246,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Micro Lab ELISA Reader','Micro Lab ELISA Reader',250,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Micro Pipet','Micro Pipet',253,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Microtome','Microtome',256,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Microwave Diathermy','Microwave Diathermy',259,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Mikroskop Laboratorium','Mikroskop Laboratorium',262,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Mikroskop Operasi','Mikroskop Operasi',266,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Monitoring Hemodynamic System','Monitoring Hemodynamic System',269,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('MRI','MRI',275,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Pacemaker','Pacemaker',278,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Phacoemulsification','Phacoemulsification',281,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Photo Therapy Unit','Photo Therapy Unit',285,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Plasma Sterilization','Plasma Sterilization',288,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Pulse Oximetry','Pulse Oximetry',292,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Resuscitator Dewasa','Resuscitator Dewasa',296,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Shortwave Diathermy','Shortwave Diathermy',300,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Slit Lamp','Slit Lamp',303,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Spectrophotometer','Spectrophotometer',306,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Spirometer','Spirometer',309,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Sterilizer Gas Ethylene Oxide','Sterilizer Gas Ethylene Oxide',312,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Suction Pump','Suction Pump',316,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Syringe Pump','Syringe Pump',319,'Body/Chasing
Power Supply
Pole Clamp
Battery Pack
Display
Control Key Pad
Self Test
Program Menu
System Setup
Compatibility infusion Set
Plugger
Door Oper & Close function
Sensor safety','Ground Resistance | ≤0,5 Ω
Kelembapan | % Humidity','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',1);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Tensimeter Anaeroid','Tensimeter Anaeroid',322,'Ball Pump/Bulb
Pressure Gauge
Manset
Tubing
Connector
Labeling
Accessories','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',1);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Tensimeter Digital','Tensimeter Digital',325,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Timbangan Bayi','Timbangan Bayi',328,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Timbangan Dewasa','Timbangan Dewasa',331,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Treadmill Test System','Treadmill Test System',334,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ultrasonic Cleaner','Ultrasonic Cleaner',337,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ultrasonograph (USG)','Ultrasonograph, USG',340,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ultrasound Therapy','Ultrasound Therapy',343,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ultraviolet Sterilizer','Ultraviolet Sterilizer',346,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Vacuum Extractor (Electric)','Vacuum Extractor',350,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Vein Viewer','Vein Viewer',353,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Ventilator','Ventilator',356,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('Water Bath','Water Bath',360,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray C-Arm','X-Ray C-Arm',363,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Dental','X-Ray Dental',366,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Dental Panoramic','X-Ray Dental Panoramic',369,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Mammography','X-Ray Mammography',371,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Mobile Unit','X-Ray Mobile Unit',374,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Radiography Flouroscopy Unit','X-Ray Radiography Flouroscopy Unit',377,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
INSERT INTO "TemplateLembarKerja" ("nama","kataKunci","halaman","kualitatif","kuantitatif","preventif","lengkap") VALUES ('X-Ray Stasioner','X-Ray Stasioner',380,'Body/Chassis/Fisik
Power Supply/Kabel Daya
Switch/Kontrol
Display/Indikator
Alarm
Aksesoris
Fungsi Operasional','Ground Resistance | ≤0,5 Ω
Touch Current | ≤500 µA
Chassis Leakage Current (installed equipment) | ≤10 mA
Lead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded','Clean exterior and accessories
Pembersihan eksterior/luar alat
Pengencangan baut
Penggantian spare part yang rusak
Pelabelan kalibrasi eksternal
Calibrate/adjust electrical components
Calibrate/adjust mechanical components
Replace',0);
