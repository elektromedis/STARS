/**
 * Tautan pratinjau EMASCARE tanpa akun (mis. untuk dosen pembimbing / tamu): baca saja, berbatas waktu,
 * dibuat & dicabut Admin. Disimpan di Pengaturan "imms_tamu" berupa sidik SHA-256 token (token asli tidak disimpan).
 * Sesi tamu berperan "Tamu": lolos halaman EMASCARE tingkat Pengguna ruangan, ditolak di semua aksi tulis & seluruh STARS.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { bacaPengaturan, simpanPengaturan } from "./pengaturan";

const KUNCI = "imms_tamu";
export const PERAN_TAMU = "Tamu";
type Data = { sidik: string; sampai: string; dibuat: string; oleh: string | null; ket: string | null };
const sidik = (t: string) => createHash("sha256").update(t).digest("hex");

export async function statusTamu(): Promise<Omit<Data, "sidik"> | null> {
  const m = await bacaPengaturan(KUNCI); if (!m) return null;
  try { const { sidik: _s, ...d } = JSON.parse(m) as Data; void _s; return new Date(d.sampai) > new Date() ? d : null; } catch { return null; }
}

export async function buatTamu(hari: number, oleh: string | null, ket: string | null) {
  const token = randomBytes(24).toString("base64url");
  const sampai = new Date(Date.now() + hari * 86_400_000).toISOString();
  await simpanPengaturan(KUNCI, JSON.stringify({ sidik: sidik(token), sampai, dibuat: new Date().toISOString(), oleh, ket } satisfies Data), oleh);
  return { token, sampai };
}

export const cabutTamu = (oleh: string | null) => simpanPengaturan(KUNCI, null, oleh);

export async function cekTamu(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return false;
  const m = await bacaPengaturan(KUNCI); if (!m) return false;
  try {
    const d = JSON.parse(m) as Data;
    if (new Date(d.sampai) <= new Date()) return false;
    const a = Buffer.from(sidik(token), "hex"), b = Buffer.from(d.sidik, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}
