-- CreateTable
CREATE TABLE "Peraturan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jenis" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "pemrakarsa" TEXT,
    "subjek" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Berlaku',
    "keterangan" TEXT,
    "tautan" TEXT,
    "berkas" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Peraturan_jenis_tahun_idx" ON "Peraturan"("jenis", "tahun");

-- Data awal: peraturan yang menjadi dasar fitur STARS (tautan = pencarian di JDIH BPK)
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('UU','17',2023,'Kesehatan','Pemerintah Pusat','Alat Kesehatan','https://peraturan.bpk.go.id/Search?keywords=UU%2017%202023');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('UU','11',2008,'Informasi dan Transaksi Elektronik (terakhir diubah UU 1/2024)','Pemerintah Pusat','Data & TTE','https://peraturan.bpk.go.id/Search?keywords=UU%2011%202008');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('UU','27',2022,'Pelindungan Data Pribadi','Pemerintah Pusat','Data & TTE','https://peraturan.bpk.go.id/Search?keywords=UU%2027%202022');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('PP','28',2024,'Peraturan Pelaksanaan Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan','Pemerintah Pusat','Alat Kesehatan','https://peraturan.bpk.go.id/Search?keywords=PP%2028%202024');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('PP','71',2019,'Penyelenggaraan Sistem dan Transaksi Elektronik','Pemerintah Pusat','Data & TTE','https://peraturan.bpk.go.id/Search?keywords=PP%2071%202019');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('PP','27',2014,'Pengelolaan Barang Milik Negara/Daerah','Pemerintah Pusat','Barang Milik Daerah','https://peraturan.bpk.go.id/Search?keywords=PP%2027%202014');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Perpres','16',2018,'Pengadaan Barang/Jasa Pemerintah (diubah Perpres 12/2021)','Pemerintah Pusat','Pengadaan','https://peraturan.bpk.go.id/Search?keywords=Perpres%2016%202018');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permenkes','54',2015,'Pengujian dan Kalibrasi Alat Kesehatan','Kementerian Kesehatan','Alat Kesehatan','https://peraturan.bpk.go.id/Search?keywords=Permenkes%2054%202015');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permenkes','15',2023,'Pemeliharaan Alat Kesehatan di Fasilitas Pelayanan Kesehatan','Kementerian Kesehatan','Alat Kesehatan','https://peraturan.bpk.go.id/Search?keywords=Permenkes%2015%202023');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permenkes','51',2017,'Penilaian Teknologi Kesehatan (Health Technology Assessment)','Kementerian Kesehatan','Alat Kesehatan','https://peraturan.bpk.go.id/Search?keywords=Permenkes%2051%202017');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permenkes','51',2015,'Izin dan Penyelenggaraan Praktik Elektromedis','Kementerian Kesehatan','SDM','https://peraturan.bpk.go.id/Search?keywords=Permenkes%2051%202015');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permenkes','24',2022,'Rekam Medis','Kementerian Kesehatan','Data & TTE','https://peraturan.bpk.go.id/Search?keywords=Permenkes%2024%202022');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('PermenPAN-RB','28',2013,'Jabatan Fungsional Elektromedis dan Angka Kreditnya','Kementerian PANRB','SDM','https://peraturan.bpk.go.id/Search?keywords=PermenPAN-RB%2028%202013');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permendagri','19',2016,'Pedoman Pengelolaan Barang Milik Daerah','Kementerian Dalam Negeri','Barang Milik Daerah','https://peraturan.bpk.go.id/Search?keywords=Permendagri%2019%202016');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permendagri','47',2021,'Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan Barang Milik Daerah','Kementerian Dalam Negeri','Barang Milik Daerah','https://peraturan.bpk.go.id/Search?keywords=Permendagri%2047%202021');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permendagri','77',2020,'Pedoman Teknis Pengelolaan Keuangan Daerah','Kementerian Dalam Negeri','Pengadaan','https://peraturan.bpk.go.id/Search?keywords=Permendagri%2077%202020');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Permendagri','79',2018,'Badan Layanan Umum Daerah','Kementerian Dalam Negeri','Pengadaan','https://peraturan.bpk.go.id/Search?keywords=Permendagri%2079%202018');
INSERT INTO "Peraturan" ("jenis","nomor","tahun","judul","pemrakarsa","subjek","tautan") VALUES ('Kepmenkes','HK.01.07/MENKES/1128',2022,'Standar Akreditasi Rumah Sakit','Kementerian Kesehatan','Mutu & Akreditasi','https://peraturan.bpk.go.id/Search?keywords=Standar%20Akreditasi%20Rumah%20Sakit');
