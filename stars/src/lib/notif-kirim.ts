/**
 * Kirim ringkasan perubahan data (STARS · EMASCARE · TRILUX) ke email dan WhatsApp petugas.
 * Berjalan berkala dari instrumentation-node (NOTIF_KIRIM_MENIT, bawaan 10; 0 = mati).
 *  - Email: memakai SMTP yang sama (src/lib/email.ts).
 *  - WhatsApp: lewat gateway HTTP (mis. Fonnte) — WA_GATEWAY_URL + WA_GATEWAY_TOKEN.
 *    Permintaan: POST form {target, message}, header Authorization: <token>.
 * Preferensi tiap pengguna disimpan di tabel Pengaturan, kunci "notif:<id>".
 * Kursor "notif_kursor" = id AuditLog terakhir yang sudah diproses, jadi tidak ada kiriman ganda.
 */
import { prisma } from "./prisma";
import { emailSiap, kirimEmail } from "./email";
import { bacaPengaturan, simpanPengaturan } from "./pengaturan";
import { itemPerubahan, saringPerubahan } from "./notifikasi";
import { tampilWa } from "./wa";

export type PrefNotif = { email: boolean; wa: string | null };
const KURSOR = "notif_kursor";
export const kunciPref = (id: number) => `notif:${id}`;
export const waSiap = () => Boolean(process.env.WA_GATEWAY_URL && process.env.WA_GATEWAY_TOKEN);

/** Bawaan: email aktif (bila SMTP siap), WA belum diisi. */
export async function bacaPref(id: number): Promise<PrefNotif> {
  const m = await bacaPengaturan(kunciPref(id));
  if (!m) return { email: true, wa: null };
  try { const j = JSON.parse(m) as Partial<PrefNotif>; return { email: j.email !== false, wa: typeof j.wa === "string" ? j.wa : null }; } catch { return { email: true, wa: null }; }
}

export async function kirimWa(nomor: string, pesan: string) {
  if (!waSiap()) throw new Error("Gateway WA belum diatur");
  const r = await fetch(process.env.WA_GATEWAY_URL!, {
    method: "POST", headers: { Authorization: process.env.WA_GATEWAY_TOKEN! },
    body: new URLSearchParams({ target: nomor, message: pesan, countryCode: "62" }), signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Gateway WA HTTP ${r.status}`);
}

const aman = (s: string) => s.replace(/[<>&"]/g, "");
const jam = (d: Date) => d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });

let jalan = false;
/** Satu putaran pengiriman. Mengembalikan jumlah pesan terkirim. */
export async function kirimNotifPerubahan(): Promise<number> {
  if (jalan || (!emailSiap() && !waSiap())) return 0;
  jalan = true;
  try {
    const kursor = Number(await bacaPengaturan(KURSOR));
    if (!kursor) { // putaran pertama: mulai dari sekarang, jangan kirim riwayat lama
      const akhir = await prisma.auditLog.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
      await simpanPengaturan(KURSOR, String(akhir?.id ?? 0) || "0", "sistem");
      if (akhir) return 0;
    }
    const log = await prisma.auditLog.findMany({ where: { id: { gt: kursor || 0 }, ...saringPerubahan }, orderBy: { id: "asc" }, take: 500 });
    const akhir = await prisma.auditLog.findFirst({ where: { id: { gt: kursor || 0 } }, orderBy: { id: "desc" }, select: { id: true } });
    if (akhir) await simpanPengaturan(KURSOR, String(akhir.id), "sistem");
    if (!log.length) return 0;

    const dasar = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
    const penerima = await prisma.pengguna.findMany({ where: { aktif: true, peran: { not: "Viewer" } }, select: { id: true, email: true, nama: true } });
    let n = 0;
    for (const p of penerima) {
      const milikLain = log.filter((l) => l.email !== p.email);
      if (!milikLain.length) continue;
      const pref = await bacaPref(p.id);
      const item = milikLain.map((l) => ({ ...itemPerubahan(l), t: l.waktu }));
      const daftar = item.slice(-15);
      const lebih = item.length - daftar.length;
      const judul = `STARS: ${item.length} perubahan data baru`;
      const baris = daftar.map((i) => `• ${jam(i.t)} — ${i.judul}: ${i.isi}`);
      if (lebih > 0) baris.unshift(`(${lebih} perubahan lebih lama tidak ditampilkan)`);
      const tautan = dasar ? `${dasar}/notifikasi` : "";
      if (pref.email && emailSiap()) {
        const html = `<p>Halo ${aman(p.nama)}, ada perubahan data di STARS / EMASCARE / TRILUX:</p><ul style="font-size:14px">${daftar.map((i) => `<li><b>${aman(i.judul)}</b> <span style="color:#64748b">${jam(i.t)}</span><br>${aman(i.isi)}</li>`).join("")}</ul>${lebih > 0 ? `<p style="color:#64748b">${lebih} perubahan lebih lama tidak ditampilkan.</p>` : ""}${tautan ? `<p><a href="${tautan}">Buka notifikasi</a></p>` : ""}<p style="color:#64748b;font-size:12px">Atur penerimaan di menu Akun Saya. STARS • RSUD Cipayung</p>`;
        await kirimEmail(p.email, judul, `Halo ${p.nama},\n\n${baris.join("\n")}\n\n${tautan}\n\nAtur penerimaan di menu Akun Saya.`, html)
          .then(() => n++).catch((e) => console.error("[notif] email:", (e as Error).message));
      }
      if (pref.wa && waSiap()) {
        await kirimWa(pref.wa, `*${judul}*\n\n${baris.slice(0, 10).join("\n")}${tautan ? `\n\n${tautan}` : ""}`)
          .then(() => n++).catch((e) => console.error(`[notif] WA ${tampilWa(pref.wa!).slice(0, 4)}…:`, (e as Error).message));
      }
    }
    return n;
  } finally { jalan = false; }
}
