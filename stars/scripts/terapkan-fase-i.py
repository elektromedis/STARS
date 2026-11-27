#!/usr/bin/env python3
"""Menerapkan Fase I (perencanaan pengadaan, inflasi/depresiasi) ke schema.prisma dan menu admin. Idempoten; membuat *.bak."""
import shutil, sys, pathlib
root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
def baca(p): return p.read_text(encoding="utf-8")
def tulis(p, s):
    b = p.with_suffix(p.suffix + ".bak")
    if not b.exists(): shutil.copy(p, b)
    p.write_text(s, encoding="utf-8")
sp = root / "prisma" / "schema.prisma"; s = baca(sp)
if "model UsulanPengadaan" not in s:
    s = s.rstrip("\n") + """

// ======================= Fase I: perencanaan pengadaan & inflasi =======================

model PaguBelanja {
  id         Int    @id @default(autoincrement())
  tahun      Int
  sumberDana String
  nilai      Float  @default(0)

  @@unique([tahun, sumberDana])
}

model InflasiTahun {
  tahun  Int   @id
  persen Float
}

/// Usulan pengadaan alat dari unit/ruangan → verifikasi (nominasi) → pagu.
model UsulanPengadaan {
  id              Int       @id @default(autoincrement())
  tahun           Int
  unitKerjaId     Int?
  ruangan         String?
  namaAlat        String
  sifat           String    @default("Baru") // Baru | Tambah | Ganti
  jumlah          Int       @default(1)
  hargaSatuan     Float     @default(0)
  gantiUsia       Int?
  gantiKondisi    String?
  alasan          String?
  pengusul        String
  status          String    @default("Diajukan") // Diajukan | Disetujui | Ditolak
  jumlahSetuju    Int?
  verifikator     String?
  verifikasiPada  DateTime?
  catatan         String?
  skorUrgensi     Int?
  skorExisting    Int?
  skorPeruntukan  Int?
  kabidUrgensi    Int?
  kabidExisting   Int?
  kabidPeruntukan Int?
  sesuaiIndikator Boolean   @default(false)
  sesuaiProgram   Boolean   @default(false)
  sesuaiAspak     Boolean   @default(false)
  sesuaiLegal     Boolean   @default(false)
  skorFinal       Float?
  masukPagu       Boolean   @default(false)
  sumberDana      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([tahun, status])
  @@index([unitKerjaId])
}
"""
    tulis(sp, s)
print("schema.prisma OK")
lp = root / "src" / "app" / "admin" / "layout.tsx"; l = baca(lp)
if "/admin/pengadaan" not in l:
    a = '      { href: "/admin/aspak", label: "Kelengkapan Faskes (ASPAK)", seksi: "Inventarisasi" },'
    if a not in l: sys.exit("layout.tsx: terapkan dulu Fase F–G atau tambahkan menu manual (/admin/pengadaan, /admin/depresiasi)")
    l = l.replace(a, a + '\n      { href: "/admin/pengadaan", label: "Perencanaan Pengadaan", seksi: "Inventarisasi" },\n      { href: "/admin/depresiasi", label: "Depresiasi & Inflasi", seksi: "Inventarisasi" },', 1); tulis(lp, l)
print("layout.tsx OK")
