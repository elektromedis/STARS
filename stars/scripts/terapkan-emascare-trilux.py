#!/usr/bin/env python3
"""Menerapkan patch EMASCARE-TRILUX ke prisma/schema.prisma, menu EMASCARE (shell.tsx), dan daftar keluhan.
Idempoten; membuat cadangan *.bak.  Jalankan dari folder `stars`:  python scripts/terapkan-emascare-trilux.py"""
import re, shutil, sys, pathlib
root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
def baca(p): return p.read_text(encoding="utf-8")
def tulis(p, s):
    b = p.with_suffix(p.suffix + ".bak")
    if not b.exists(): shutil.copy(p, b)
    p.write_text(s, encoding="utf-8")
def sisip(s, model, baris, tanda):
    if tanda in s: return s
    m = re.search(r"^model %s \{.*?^\}" % model, s, re.S | re.M)
    if not m: sys.exit(f"model {model} tidak ditemukan")
    blok = m.group(0); mm = re.search(r"^\s*@@", blok, re.M)
    pos = mm.start() if mm else blok.rfind("}")
    nb = blok[:pos].rstrip("\n") + "\n" + baris + "\n\n" + blok[pos:].lstrip("\n") if mm else blok[:pos] + baris + "\n}"
    return s.replace(blok, nb)

sp = root / "prisma" / "schema.prisma"; s = baca(sp)
if "rating " not in re.search(r"^model PerintahKerja \{.*?^\}", s, re.S | re.M).group(0):
    sys.exit("Prasyarat belum ada: terapkan dulu patch Fase A–E (kolom rating pada PerintahKerja).")
s = sisip(s, "PerintahKerja", "  // --- EMASCARE: konfirmasi ruangan setelah perbaikan ---\n  hasilRuangan     String? // Berfungsi | Belum berfungsi\n  hasilRuanganOleh String?\n  hasilRuanganPada DateTime?", "hasilRuanganOleh")
s = sisip(s, "PermintaanKerja", "  pesan          PesanKeluhan[]", "PesanKeluhan[]")
s = sisip(s, "UnitKerja", "  permintaanAlat PermintaanAlat[]", "permintaanAlat PermintaanAlat[]")
if "model PesanKeluhan" not in s:
    s = s.rstrip("\n") + """

// ======================= EMASCARE dari TRILUX =======================

/// Percakapan pelapor ↔ teknisi pada satu laporan keluhan (setara messages TRILUX).
model PesanKeluhan {
  id           Int             @id @default(autoincrement())
  permintaan   PermintaanKerja @relation(fields: [permintaanId], references: [id], onDelete: Cascade)
  permintaanId Int
  email        String?
  nama         String
  peran        String
  isi          String
  createdAt    DateTime        @default(now())

  @@index([permintaanId])
}

/// Permintaan alat dari ruangan/instalasi (setara request_asset TRILUX).
model PermintaanAlat {
  id               Int                  @id @default(autoincrement())
  nomor            String               @unique // PA-2026-0001
  unitKerja        UnitKerja?           @relation(fields: [unitKerjaId], references: [id], onDelete: SetNull)
  unitKerjaId      Int?
  ruangan          String?
  pemohon          String
  emailPemohon     String?
  uraian           String
  status           String               @default("Baru") // Baru | Pengadaan | Mutasi | Relokasi | Ditolak | Selesai | Dibatalkan
  diputuskanOleh   String?
  diputuskanPada   DateTime?
  catatanKeputusan String?
  item             ItemPermintaanAlat[]
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  @@index([status])
  @@index([unitKerjaId])
}

model ItemPermintaanAlat {
  id              Int            @id @default(autoincrement())
  permintaan      PermintaanAlat @relation(fields: [permintaanId], references: [id], onDelete: Cascade)
  permintaanId    Int
  namaAlat        String
  jumlah          Int            @default(1)
  jumlahSetuju    Int?
  jumlahTerpenuhi Int            @default(0)

  @@index([permintaanId])
}
"""
tulis(sp, s); print("schema.prisma OK")

hp = root / "src" / "components" / "imms" / "shell.tsx"; h = baca(hp)
if "/imms/permintaan-alat" not in h:
    a = '    { href: "/imms/keluhan", label: "Laporan Keluhan", ikon: Activity },'
    if a not in h: sys.exit("shell.tsx: titik sisip menu tidak ditemukan — tambahkan menu manual (lihat README)")
    h = h.replace(a, a + '\n    { href: "/imms/penilaian", label: "Penilaian Perbaikan", ikon: CheckCircle2 },\n    { href: "/imms/permintaan-alat", label: "Permintaan Alat", ikon: PackageSearch },', 1)
    tulis(hp, h)
print("shell.tsx OK")

kp = root / "src" / "app" / "imms" / "(app)" / "keluhan" / "page.tsx"; k = baca(kp)
lama = '<td className="whitespace-nowrap font-medium">{w.nomor}{w.perintah &&'
if "/imms/keluhan/${w.nomor}" not in k:
    if lama not in k: print("PERINGATAN: tautan percakapan di daftar keluhan tidak dapat disisipkan otomatis; buka /imms/keluhan/<nomor> langsung atau ubah manual.")
    else:
        k = k.replace(lama, '<td className="whitespace-nowrap font-medium"><Link className="tautan" href={`/imms/keluhan/${w.nomor}`}>{w.nomor}</Link>{w.perintah &&', 1); tulis(kp, k)
print("keluhan/page.tsx OK")
