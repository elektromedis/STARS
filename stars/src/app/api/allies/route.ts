import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { unitTerkunci } from "@/lib/akses";
import { jawabAllies, type Jawaban } from "@/lib/allies";
import { aiAktif, jawabAI, type Riwayat } from "@/lib/allies-ai";
import { KARYAWAN, type IdKaryawan } from "@/lib/allies-karyawan";
import { ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Tanya ALLIES: login + kunci API → mode AI; selain itu mesin aturan lokal. Pesan tidak disimpan oleh STARS. */
export async function POST(req: NextRequest) {
  const ip = ipDari(req.headers) ?? "lokal";
  if (!batasi(`allies:${ip}`, 40, 60_000).boleh) return NextResponse.json({ error: "Terlalu banyak pertanyaan; tunggu sebentar." }, { status: 429 });
  let pesan = "", riwayat: Riwayat = [], karyawan: IdKaryawan = "umum";
  try {
    const j = (await req.json()) as { pesan?: unknown; riwayat?: unknown; karyawan?: unknown };
    pesan = typeof j.pesan === "string" ? j.pesan.slice(0, 500) : "";
    if (KARYAWAN.some((k) => k.id === j.karyawan)) karyawan = j.karyawan as IdKaryawan;
    if (Array.isArray(j.riwayat)) {
      riwayat = j.riwayat.slice(-8).flatMap((m: { peran?: unknown; teks?: unknown }) => ((m?.peran === "user" || m?.peran === "assistant") && typeof m.teks === "string" && m.teks.trim() ? [{ peran: m.peran, teks: m.teks.slice(0, 3000) }] : []));
      while (riwayat[0]?.peran === "assistant") riwayat.shift();
    }
  } catch {
    return NextResponse.json({ error: "Format salah." }, { status: 400 });
  }
  const kunci = await unitTerkunci();
  const unit = kunci?.id ?? null;
  const sesi = await auth();
  let jawab: Jawaban | null = null, catatan = "";
  if (sesi?.user && aiAktif() && pesan.trim()) {
    if (!batasi(`allies-ai:${sesi.user.email ?? ip}`, 60, 3_600_000).boleh) catatan = "Batas 60 pertanyaan AI per jam tercapai. Jawaban ini dari mesin lokal ALLIES.";
    else {
      try { jawab = await jawabAI(pesan, riwayat, karyawan, unit); }
      catch (e) { console.error("ALLIES AI gagal:", e instanceof Error ? e.name : "galat"); catatan = "Layanan AI sedang tidak tersedia. Jawaban ini dari mesin lokal ALLIES."; }
    }
  }
  if (!jawab) {
    jawab = await jawabAllies(pesan, unit);
    if (catatan) jawab = { ...jawab, blok: [{ jenis: "teks", isi: catatan }, ...jawab.blok] };
  }
  return NextResponse.json(jawab, { headers: { "Cache-Control": "no-store" } });
}
