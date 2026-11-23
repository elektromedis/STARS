import { NextResponse, type NextRequest } from "next/server";
import { jawabAllies, ringkasanAllies } from "@/lib/allies";
import { aiAktif, jawabAI } from "@/lib/allies-ai";
import { KARYAWAN, type IdKaryawan } from "@/lib/allies-karyawan";
import { tolakTanpaToken } from "@/lib/integrasi";
import { batasi } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** n8n: ringkasan tugas ALLIES tanpa data pribadi. */
export async function GET(req: NextRequest) {
  const tolak = tolakTanpaToken(req);
  if (tolak) return tolak;
  const r = await ringkasanAllies(null);
  const alat = (a: (typeof r.semua)[number]) => ({ kode: a.kode, nama: a.nama, unit: a.unit, status: a.kal.label, skor: a.skor });
  return NextResponse.json({
    dibuat: new Date().toISOString(), aktif: r.aktif, perKeputusan: r.perKeputusan, perluKalibrasi: r.kalibrasi.length, kandidatGanti: r.kandidat.length,
    pemeliharaanTerbuka: r.semua.filter((a) => a.aktif && (a.woTerbuka + a.laporanTerbuka > 0 || a.preventifTempo)).length,
    kalibrasiPrioritas: r.kalibrasi.slice(0, 10).map(alat), gantiPrioritas: r.kandidat.slice(0, 10).map(alat),
  }, { headers: { "Cache-Control": "no-store" } });
}

/** n8n: tanya ALLIES dengan { pesan, karyawan? }. */
export async function POST(req: NextRequest) {
  const tolak = tolakTanpaToken(req);
  if (tolak) return tolak;
  if (!batasi("allies-n8n", 30, 3_600_000).boleh) return NextResponse.json({ error: "Batas 30 pertanyaan per jam tercapai." }, { status: 429 });
  const j = (await req.json().catch(() => null)) as { pesan?: unknown; karyawan?: unknown } | null;
  const pesan = typeof j?.pesan === "string" ? j.pesan.trim().slice(0, 500) : "";
  if (!pesan) return NextResponse.json({ error: "pesan wajib diisi." }, { status: 400 });
  const karyawan = KARYAWAN.some((k) => k.id === j?.karyawan) ? (j?.karyawan as IdKaryawan) : "umum";
  try {
    const a = aiAktif() ? await jawabAI(pesan, [], karyawan, null) : await jawabAllies(pesan, null);
    return NextResponse.json({ jawaban: a.asli ?? a.blok.flatMap((b) => (b.jenis === "teks" ? [b.isi] : [])).join("\n"), ai: Boolean(a.ai) });
  } catch {
    const a = await jawabAllies(pesan, null);
    return NextResponse.json({ jawaban: a.blok.flatMap((b) => (b.jenis === "teks" ? [b.isi] : [])).join("\n"), ai: false });
  }
}
