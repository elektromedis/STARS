-- Indeks tambahan agar daftar alat, filter unit, dan riwayat perbaikan per alat tetap cepat untuk ribuan alat.
CREATE INDEX IF NOT EXISTS "Alat_aktif_unitKerjaId_idx" ON "Alat"("aktif", "unitKerjaId");
CREATE INDEX IF NOT EXISTS "Alat_nama_idx" ON "Alat"("nama");
CREATE INDEX IF NOT EXISTS "PermintaanKerja_alatId_idx" ON "PermintaanKerja"("alatId");
CREATE INDEX IF NOT EXISTS "PerintahKerja_alatId_idx" ON "PerintahKerja"("alatId");
