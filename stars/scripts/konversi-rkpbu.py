"""
Konverter sekali pakai: kertas kerja RKPBU/RKBU (Excel RS) -> prisma/data/paket.json

Pemakaian:
    python -I scripts/konversi-rkpbu.py "C:/path/RKPBU ... .xlsx"

Hanya sheet dengan satu blok tabel standar yang dibaca (lihat SHEETS).
Kolom dicari berdasarkan NAMA header, bukan posisi, karena tiap sheet
posisinya berbeda. Hasilnya dipakai oleh `npm run db:seed`.
"""
from __future__ import annotations

import json
import re
import sys
import warnings
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "prisma" / "data" / "paket.json"

# sheet -> (tahun, tahap, jenis)
SHEETS = {
    "BLUD Perubahan Fase II 2024": (2024, "Perubahan II", "Pemeliharaan"),
    "BLUD Penetapan 2025": (2025, "Penetapan", "Pemeliharaan"),
    "BLUD Penetapan 2026": (2026, "Penetapan", "Pemeliharaan"),
    "BLUD Pergeseran 2026": (2026, "Pergeseran", "Pemeliharaan"),
    "RKPBU PM ALKES - PERUBAHAN 2026": (2026, "Perubahan", "Pemeliharaan"),
    "RKPBU PM ALKES - RANWAL 2027": (2027, "Ranwal", "Pemeliharaan"),
    "RKBU MODAL ALKES - RANWAL 2027": (2027, "Ranwal", "Pengadaan"),
}

# Singkatan tahap untuk kode paket (harus unik agar kode tidak bertabrakan)
TAHAP_KODE = {"Ranwal": "RW", "Penetapan": "PN", "Pergeseran": "PG", "Perubahan": "PB", "Perubahan II": "PB2"}

UNIT_KERJA = [
    "AMBULANS", "CSSD", "ELEKTROMEDIK", "FARMASI", "FISIOTERAPI", "GIZI", "GUDANG ALAT KESEHATAN",
    "GUDANG FARMASI", "GUDANG LOGISTIK", "GUDANG PERSIAPAN PEMUSNAHAN", "HCU-ICU", "IGD", "IT",
    "KEBIDANAN", "KESLING", "KMJ", "LAB", "OK", "PERINA", "POLI GIGI", "POLI OBGYN", "RADIOLOGI",
    "RAJAL", "RANAP", "RANAP ISO", "RECALL", "RM", "TIDAK ADA",
]

# Ejaan lain yang muncul di kertas kerja -> nama unit resmi
ALIAS = {
    "HCU/ICU": "HCU-ICU", "ICU": "HCU-ICU", "HCU": "HCU-ICU", "ICU-HCU": "HCU-ICU", "HCU - ICU": "HCU-ICU",
    "LABORATORIUM": "LAB", "LABORAT": "LAB",
    "RADIOLOGY": "RADIOLOGI", "RONTGEN": "RADIOLOGI",
    "KAMAR OPERASI": "OK", "OK (KAMAR OPERASI)": "OK", "IBS": "OK",
    "PERINATOLOGI": "PERINA", "NICU": "PERINA",
    "VK": "KEBIDANAN", "PONEK": "KEBIDANAN", "KAMAR BERSALIN": "KEBIDANAN",
    "REKAM MEDIS": "RM", "REKAM MEDIK": "RM",
    "RAWAT JALAN": "RAJAL", "POLIKLINIK": "RAJAL", "POLI": "RAJAL",
    "RAWAT INAP": "RANAP", "RANAP ISOLASI": "RANAP ISO", "ISOLASI": "RANAP ISO",
    "GUDANG ALKES": "GUDANG ALAT KESEHATAN", "GUDANG KARANTINA ALAT KESEHATAN": "GUDANG ALAT KESEHATAN",
    "INSTALASI GIZI": "GIZI", "DAPUR": "GIZI",
    "INSTALASI FARMASI": "FARMASI", "APOTEK": "FARMASI",
    "ELEKTROMEDIS": "ELEKTROMEDIK", "IPSRS": "ELEKTROMEDIK", "TEKNISI": "ELEKTROMEDIK",
    "KESEHATAN LINGKUNGAN": "KESLING", "SANITASI": "KESLING",
    "INTENSIF": "HCU-ICU", "ICU-NICU": "HCU-ICU", "RUANG INTENSIF": "HCU-ICU",
    "MCU": "RAJAL", "MEDICAL CHECK UP": "RAJAL",
    "YANMED": "TIDAK ADA", "PELAYANAN MEDIS": "TIDAK ADA", "MANAJEMEN": "TIDAK ADA",
    "SELURUH UNIT": "TIDAK ADA", "SEMUA UNIT": "TIDAK ADA", "-": "TIDAK ADA", "": "TIDAK ADA",
}


def norm(s: object) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def _match_single(u: str) -> str | None:
    if u in UNIT_KERJA:
        return u
    if u in ALIAS:
        return ALIAS[u]
    # cocokkan awalan, mis. "GUDANG ALAT KESEHATAN LT 2" -> GUDANG ALAT KESEHATAN
    for unit in sorted(UNIT_KERJA, key=len, reverse=True):
        if unit != "TIDAK ADA" and u.startswith(unit + " "):
            return unit
    for alias, unit in ALIAS.items():
        if alias and u.startswith(alias + " "):
            return unit
    return None


def match_unit(lokasi: str) -> str:
    """Lokasi bisa berisi beberapa unit ("ICU, IGD, OK"): unit PERTAMA yang dikenal
    dipakai sebagai unit utama; teks aslinya tetap disimpan di kolom lokasiAsli."""
    u = norm(lokasi).upper()
    hit = _match_single(u)
    if hit:
        return hit
    for bagian in re.split(r"[,/;&]| DAN ", u):
        hit = _match_single(bagian.strip())
        if hit and hit != "TIDAK ADA":
            return hit
    return "TIDAK ADA"


def kategori_dari(rekening: str, uraian: str, barang: str) -> str:
    teks = f"{rekening} {uraian} {barang}".lower()
    if "kalibrasi" in teks or "pengujian" in teks:
        return "Pengujian & Kalibrasi"
    if "sarana" in teks or "prasarana" in teks or "gedung" in teks or "bangunan" in teks:
        return "Sarana & Prasarana"
    if "suku cadang" in teks or "sparepart" in teks or "spare part" in teks or "aksesoris" in teks or "accessories" in teks:
        return "Suku Cadang & Aksesori"
    if "kontrak servis" in teks or "service contract" in teks or "kso" in teks:
        return "Kontrak Servis"
    if "perbaikan" in teks or "servis" in teks or "service" in teks or "jasa pemeliharaan" in teks:
        return "Jasa Perbaikan & Servis"
    if "modal" in teks or "pengadaan" in teks or "belanja modal" in teks:
        return "Belanja Modal Alkes"
    if "pemeliharaan alat" in teks or "alat kedokteran" in teks or "alat kesehatan" in teks or "ipm" in teks:
        return "Pemeliharaan Alat Kesehatan"
    return "Pemeliharaan Lainnya"


def find_header(rows):
    for i, r in enumerate(rows[:40]):
        for c in r:
            if c is not None and norm(c).lower().startswith("nama rekening"):
                return i
    return None


def col_index(header, *names, after=-1):
    """Indeks pertama (setelah `after`) yang nama headernya cocok persis (case-insensitive)."""
    wanted = {n.lower() for n in names}
    for j, c in enumerate(header):
        if j > after and c is not None and norm(c).lower() in wanted:
            return j
    return None


def to_num(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.replace("Rp", "").replace(".", "").replace(",", ".").strip()
        try:
            return float(s)
        except ValueError:
            return None
    return None


def to_bool(v):
    if isinstance(v, bool):
        return v
    s = norm(v).lower()
    return s in {"true", "ya", "y", "1", "terserap", "sudah", "v", "✓"}


def main(path: str):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    hasil = []
    stat_unit = Counter()
    tak_cocok = Counter()
    ringkas = defaultdict(lambda: {"baris": 0, "nilai": 0.0})

    for nama_sheet, (tahun, tahap, jenis) in SHEETS.items():
        if nama_sheet not in wb.sheetnames:
            print(f"[LEWAT] sheet tidak ada: {nama_sheet}")
            continue
        rows = list(wb[nama_sheet].iter_rows(values_only=True))
        h = find_header(rows)
        if h is None:
            print(f"[LEWAT] header tidak ditemukan: {nama_sheet}")
            continue
        h1, h2 = rows[h], rows[h + 1]
        c = {
            "rekening": col_index(h1, "Nama Rekening"),
            "barang": col_index(h1, "Barang/Jasa", "Nama Barang/Jasa"),
            "uraian": col_index(h1, "Uraian Pemeliharaan"),
            "lokasi": col_index(h1, "Lokasi", "Lokasi Barang"),
            "kode": col_index(h1, "Kode Barang"),
            "serapan": col_index(h1, "Serapan"),
            "prioritas": col_index(h1, "Prioritas"),
            "link": col_index(h1, "Link Harga"),
            "ket": col_index(h1, "Keterangan"),
            "vol1": col_index(h2, "Vol 1"),
            "vol2": col_index(h2, "Vol 2"),
            "harga": col_index(h2, "Satuan (Rp)"),
            "jumlah": col_index(h2, "Jumlah (Rp)"),
        }
        c["sat1"] = col_index(h2, "Satuan", after=c["vol1"]) if c["vol1"] is not None else None
        c["sat2"] = col_index(h2, "Satuan", after=c["vol2"]) if c["vol2"] is not None else None
        wajib = ["rekening", "barang", "lokasi", "jumlah"]
        if any(c[k] is None for k in wajib):
            print(f"[LEWAT] kolom wajib hilang di {nama_sheet}: {c}")
            continue

        def get(r, key):
            j = c.get(key)
            return r[j] if j is not None and j < len(r) else None

        no = 0
        for r in rows[h + 2:]:
            barang = norm(get(r, "barang"))
            jumlah = to_num(get(r, "jumlah"))
            # Lewati baris tanpa nama/nilai, baris pseudo-header ("Column 2"), dan baris bernilai 0
            # (di kertas kerja, baris nilai 0 adalah sisa/duplikat yang belum dihapus, bukan item anggaran).
            if not barang or jumlah is None or jumlah <= 0 or barang.lower().startswith("column"):
                continue
            no += 1
            lokasi = norm(get(r, "lokasi"))
            unit = match_unit(lokasi)
            if unit == "TIDAK ADA" and lokasi.upper() not in ("", "-", "TIDAK ADA"):
                tak_cocok[lokasi.upper()] += 1
            stat_unit[unit] += 1
            rekening = norm(get(r, "rekening"))
            uraian = norm(get(r, "uraian"))
            vol1 = to_num(get(r, "vol1")) or 1.0
            vol2 = to_num(get(r, "vol2")) or 1.0
            harga = to_num(get(r, "harga"))
            if harga is None:
                harga = jumlah / (vol1 * vol2) if vol1 * vol2 else jumlah
            tahap_kode = TAHAP_KODE[tahap]
            hasil.append({
                "kode": f"{'PM' if jenis == 'Pemeliharaan' else 'MD'}-{tahun}-{tahap_kode}-{no:04d}",
                "tahun": tahun,
                "tahap": tahap,
                "jenis": jenis,
                "sumberDana": "BLUD",
                "namaRekening": rekening,
                "namaPaket": barang,
                "uraian": uraian or None,
                "unitKerja": unit,
                "lokasiAsli": lokasi or None,
                "kodeBarang": (norm(get(r, "kode")) or None),
                "vol1": vol1,
                "satuan1": norm(get(r, "sat1")) or None,
                "vol2": vol2,
                "satuan2": norm(get(r, "sat2")) or None,
                "hargaSatuan": round(harga, 2),
                "nilai": round(jumlah, 2),
                "serapan": to_bool(get(r, "serapan")),
                "prioritas": norm(get(r, "prioritas")) or None,
                "linkHarga": norm(get(r, "link")) or None,
                "keterangan": norm(get(r, "ket")) or None,
                "kategori": kategori_dari(rekening, uraian, barang),
            })
            ringkas[nama_sheet]["baris"] += 1
            ringkas[nama_sheet]["nilai"] += jumlah

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"unitKerja": UNIT_KERJA, "paket": hasil}, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\nTersimpan {len(hasil)} baris -> {OUT.relative_to(ROOT)}\n")
    print(f"{'Sheet':40} {'Baris':>6} {'Total (Rp)':>20}")
    for s, v in ringkas.items():
        print(f"{s:40} {v['baris']:>6} {v['nilai']:>20,.0f}")
    print("\nSebaran unit kerja:", dict(stat_unit.most_common()))
    if tak_cocok:
        print("\nLokasi yang TIDAK cocok dengan 28 unit (dipetakan ke TIDAK ADA):")
        for k, n in tak_cocok.most_common():
            print(f"  {n:3} x {k}")
    kat = Counter(p["kategori"] for p in hasil)
    print("\nKategori:", dict(kat.most_common()))
    rek = Counter(p["namaRekening"] for p in hasil)
    print("\nNama rekening:", dict(rek.most_common(12)))


if __name__ == "__main__":
    main(sys.argv[1])
