#!/usr/bin/env python3
"""Menerapkan perubahan Fase A-E ke prisma/schema.prisma dan src/app/admin/layout.tsx.
Aman dijalankan ulang (idempoten). Jalankan dari folder `stars`:  python scripts/terapkan-fase-a-e.py
Buat cadangan *.bak sebelum mengubah."""
import re, shutil, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) > 1: root = pathlib.Path(sys.argv[1])

def baca(p): return p.read_text(encoding="utf-8")
def tulis(p, s):
    if not (p.with_suffix(p.suffix + ".bak")).exists(): shutil.copy(p, p.with_suffix(p.suffix + ".bak"))
    p.write_text(s, encoding="utf-8")

# ---------------- schema.prisma ----------------
sp = root / "prisma" / "schema.prisma"
s = baca(sp)

def sisip_di_model(s, model, baris_baru, tanda):
    if tanda in s: return s
    m = re.search(r"^model %s \{.*?^\}" % model, s, re.S | re.M)
    if not m: sys.exit(f"model {model} tidak ditemukan")
    blok = m.group(0)
    # sisipkan sebelum baris @@ pertama (atau sebelum penutup)
    mm = re.search(r"^\s*@@", blok, re.M)
    pos = mm.start() if mm else blok.rfind("}")
    blok2 = blok[:pos].rstrip("\n") + "\n" + baris_baru + "\n\n" + blok[pos:].lstrip("\n") if mm else blok[:pos] + baris_baru + "\n}"
    return s.replace(blok, blok2)

s = sisip_di_model(s, "Alat", """  // --- Fase A: aset tambahan (blueprint TRILUX) ---
  noInternal            String? // nomor inventaris internal (mis. EM-ICU-012)
  urutJenis             Int? // urutan alat sejenis dalam satu ruangan/unit
  soleAgent             String? // agen tunggal / distributor resmi
  tanggalTerhitung      DateTime? // tanggal mulai dihitung penyusutan
  nilaiResidu           Float? // nilai sisa di akhir usia manfaat
  kodeSimak             String? // kode barang SIMAK-BMN
  kodeSimbada           String? // kode barang SIMBADA
  penerimaan            PenerimaanAlat?   @relation(fields: [penerimaanId], references: [id], onDelete: SetNull)
  penerimaanId          Int?""", "noInternal")
s = s.replace("  @@index([nama])\n}", "  @@index([nama])\n  @@index([penerimaanId])\n  @@index([noInternal])\n}", 1) if "@@index([noInternal])" not in s else s

s = sisip_di_model(s, "JadwalPreventif", """  tugas        MasterTugas?    @relation(fields: [tugasId], references: [id], onDelete: SetNull)
  tugasId      Int?""", "tugasId      Int?")
s = s.replace("  @@index([berikutnya])\n}", "  @@index([berikutnya])\n  @@index([tugasId])\n}", 1) if "@@index([tugasId])" not in s else s

s = sisip_di_model(s, "PerintahKerja", """  // --- Fase B: rating pengguna & persetujuan ---
  rating          Int? // 1..5, diberikan pelapor/kepala ruangan
  ratingCatatan   String?
  ratingOleh      String?
  ratingPada      DateTime?
  disetujuiOleh   String? // kepala IPSRS / PJ alkes
  disetujuiPada   DateTime?""", "ratingCatatan")

s = sisip_di_model(s, "MutasiAlat", """  // --- Fase C: logistik ---
  dijemputOleh     String?
  dijemputPada     DateTime?
  gudang           String?
  nomorPenghapusan String?""", "dijemputOleh")

if "model Rekanan" not in s:
    s = s.rstrip("\n") + """

// ======================= Fase A–E (blueprint TRILUX → STARS) =======================

/// Satu tabel untuk supplier, rekanan pengadaan, kalibrator, dan penyedia servis (kolom `jenis`).
model Rekanan {
  id         Int              @id @default(autoincrement())
  nama       String
  jenis      String           @default("Supplier") // Supplier | Rekanan | Kalibrator | Servis
  alamat     String?
  kontak     String?
  telepon    String?
  email      String?
  sertifikat String? // nomor akreditasi (kalibrator, mis. KAN) / izin penyalur alkes
  catatan    String?
  aktif      Boolean          @default(true)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt
  penerimaan PenerimaanAlat[]

  @@unique([nama, jenis])
  @@index([jenis])
}

model MerkAlat {
  id     Int        @id @default(autoincrement())
  nama   String     @unique
  negara String?
  aktif  Boolean    @default(true)
  tipe   TipeAlat[]
}

model TipeAlat {
  id       Int      @id @default(autoincrement())
  merk     MerkAlat @relation(fields: [merkId], references: [id], onDelete: Cascade)
  merkId   Int
  nama     String
  namaAlat String? // jenis alat, mis. "Infusion Pump"
  aktif    Boolean  @default(true)

  @@unique([merkId, nama])
}

model PenerimaanAlat {
  id           Int                @id @default(autoincrement())
  nomor        String             @unique // PNR-2026-0001
  nomorKontrak String
  tanggal      DateTime
  nomorBap     String? // Berita Acara Penerimaan / serah terima
  tanggalBap   DateTime?
  rekanan      Rekanan?           @relation(fields: [rekananId], references: [id], onDelete: SetNull)
  rekananId    Int?
  tipe         String             @default("Pembelian") // Pembelian | Hibah | Pinjam pakai | KSO | Lainnya
  jenis        String             @default("Medik") // Medik | Non Medik
  nilai        Float?
  catatan      String?
  oleh         String?
  berkas       BerkasPenerimaan[]
  alat         Alat[]
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([tanggal])
  @@index([rekananId])
}

model BerkasPenerimaan {
  id           Int            @id @default(autoincrement())
  penerimaan   PenerimaanAlat @relation(fields: [penerimaanId], references: [id], onDelete: Cascade)
  penerimaanId Int
  jenis        String         @default("Kontrak") // Kontrak | BAP | Faktur | Lainnya
  nama         String // nama asli berkas
  berkas       String // nama simpan di UPLOAD_DIR/dokumen-alat
  ukuran       Int?
  oleh         String?
  createdAt    DateTime       @default(now())

  @@index([penerimaanId])
}

/// SKP = Sistem Kredit Poin (seperti tabel `skp` TRILUX): poin yang didapat teknisi per tugas selesai.
model Skp {
  id        Int           @id @default(autoincrement())
  kode      String        @unique
  nama      String
  poin      Float         @default(0)
  uraian    String?
  aktif     Boolean       @default(true)
  tugas     MasterTugas[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

/// Master tugas pemeliharaan (preventif/kalibrasi/inspeksi) — dasar generator jadwal massal.
model MasterTugas {
  id          Int               @id @default(autoincrement())
  nama        String            @unique
  jenis       String            @default("Preventif") // Preventif | Kalibrasi | Inspeksi | Korektif
  durasiMenit Int               @default(60)
  periodeHari Int               @default(90)
  biaya       Float             @default(0)
  kritis      Boolean           @default(false)
  kataKunci   String? // pencocok nama alat, dipisah koma; kosong = semua alat
  checklist   String?
  sukuCadang  String? // satu per baris
  skp         Skp?              @relation(fields: [skpId], references: [id], onDelete: SetNull)
  skpId       Int?
  aktif       Boolean           @default(true)
  jadwal      JadwalPreventif[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([jenis])
}
"""
tulis(sp, s)
print("schema.prisma OK")

# ---------------- admin/layout.tsx ----------------
lp = root / "src" / "app" / "admin" / "layout.tsx"
l = baca(lp)
if "/admin/penerimaan" not in l:
    l = l.replace('      { href: "/admin/stok", label: "Sparepart & BHP-BMHP", seksi: "Inventarisasi" },',
                  '      { href: "/admin/stok", label: "Sparepart & BHP-BMHP", seksi: "Inventarisasi" },\n'
                  '      { href: "/admin/penerimaan", label: "Penerimaan Alat", seksi: "Inventarisasi" },\n'
                  '      { href: "/admin/master", label: "Master Rekanan & Merk", seksi: "Inventarisasi" },\n'
                  '      { href: "/admin/logbook", label: "Log Book Alat", seksi: "Inventarisasi" },', 1)
    l = l.replace('      { href: "/admin/jadwal", label: "Pemeliharaan Preventif" },',
                  '      { href: "/admin/jadwal", label: "Pemeliharaan Preventif" },\n'
                  '      { href: "/admin/tugas", label: "Master Tugas & SKP" },\n'
                  '      { href: "/admin/jadwal-massal", label: "Jadwal Massal" },\n'
                  '      { href: "/admin/rating", label: "Rating & Persetujuan WO" },\n'
                  '      { href: "/admin/logistik", label: "Logistik Mutasi" },\n'
                  '      { href: "/admin/kinerja", label: "Kinerja Pemeliharaan" },', 1)
    if "/admin/penerimaan" not in l: sys.exit("layout.tsx: titik sisip tidak ditemukan — tambahkan menu secara manual (lihat README)")
    tulis(lp, l)
print("layout.tsx OK")
