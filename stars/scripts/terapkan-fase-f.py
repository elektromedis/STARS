#!/usr/bin/env python3
"""Menerapkan Fase F (modul gaya ASPAK) ke schema.prisma dan menu admin. Idempoten; membuat *.bak.
Jalankan dari folder `stars`:  python scripts/terapkan-fase-f.py"""
import shutil, sys, pathlib
root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
def baca(p): return p.read_text(encoding="utf-8")
def tulis(p, s):
    b = p.with_suffix(p.suffix + ".bak")
    if not b.exists(): shutil.copy(p, b)
    p.write_text(s, encoding="utf-8")

sp = root / "prisma" / "schema.prisma"; s = baca(sp)
if "model ProfilFaskes" not in s:
    s = s.rstrip("\n") + """

// ======================= Fase F: modul gaya ASPAK =======================

/// Satu baris (id = 1): identitas dan strata faskes.
model ProfilFaskes {
  id         Int      @id
  kodeFaskes String?
  strata     String? // Utama | Madya | Pratama | Dasar
  kelas      String?
  updatedAt  DateTime @default(now()) @updatedAt
}

/// Standar alat per strata dan ruangan (diisi pengguna dari sumber resmi).
model StandarAlat {
  id          Int     @id @default(autoincrement())
  strata      String
  kodeRuangan String?
  namaRuangan String
  namaAlat    String
  jumlah      Int     @default(1)

  @@unique([strata, namaRuangan, namaAlat])
  @@index([strata])
}

model PrasaranaFaskes {
  id        Int     @id @default(autoincrement())
  jenis     String // Genset | UPS | Listrik PLN
  uraian    String
  ada       Boolean @default(false)
  jumlah    Float   @default(0)
  satuan    String?
  berfungsi Boolean @default(false)

  @@unique([jenis, uraian])
}

/// Perizinan dan butir mutu dengan masa berlaku.
model IzinFaskes {
  id            Int       @id @default(autoincrement())
  kelompok      String // Perizinan | Mutu
  nama          String
  ada           Boolean   @default(false)
  nomor         String?
  berlakuSampai DateTime?
  selamanya     Boolean   @default(false)
  catatan       String?
  updatedAt     DateTime  @default(now()) @updatedAt

  @@unique([kelompok, nama])
}

model TenagaFaskes {
  id          Int     @id @default(autoincrement())
  jenis       String  @unique
  kelompok    String?
  jumlah      Int     @default(0)
  strMemiliki Int     @default(0)
  strAktif    Int     @default(0)
  sipMemiliki Int     @default(0)
  sipAktif    Int     @default(0)
}
"""
    tulis(sp, s)
print("schema.prisma OK")

lp = root / "src" / "app" / "admin" / "layout.tsx"; l = baca(lp)
if "/admin/aspak" not in l:
    a = '      { href: "/admin/stok", label: "Sparepart & BHP-BMHP", seksi: "Inventarisasi" },'
    if a not in l: sys.exit("layout.tsx: titik sisip tidak ditemukan — tambahkan manual: { href: \"/admin/aspak\", label: \"Kelengkapan Faskes (ASPAK)\", seksi: \"Inventarisasi\" }")
    l = l.replace(a, a + '\n      { href: "/admin/aspak", label: "Kelengkapan Faskes (ASPAK)", seksi: "Inventarisasi" },', 1); tulis(lp, l)
print("layout.tsx OK")
