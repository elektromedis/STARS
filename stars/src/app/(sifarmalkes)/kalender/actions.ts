"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { emailSiap, kirimEmail } from "@/lib/email";
import { acaraKalender, keIcs } from "@/lib/kalender";
import { normalAlamat, asalPermintaan } from "@/lib/alamat";

export type StatusAksi = { ok?: string; error?: string; url?: string } | undefined;
const HARI = 86_400_000;

async function pengguna() {
  const s = await auth();
  if (!s?.user?.email) return null;
  return prisma.pengguna.findUnique({ where: { email: s.user.email } });
}
async function dasar() { return normalAlamat(process.env.STARS_URL_PUBLIK) ?? asalPermintaan(await headers(), ""); }

/** Buat (atau buat ulang) tautan umpan kalender pribadi. */
export async function buatTautanKalender(baru: boolean): Promise<StatusAksi> {
  const u = await pengguna();
  if (!u) return { error: "Masuk terlebih dahulu." };
  let token = u.tokenKalender;
  if (!token || baru) {
    token = randomBytes(24).toString("base64url");
    await prisma.pengguna.update({ where: { id: u.id }, data: { tokenKalender: token } });
    await audit("kalender.token", { email: u.email, ip: ipDari(await headers()), detail: baru ? "dibuat ulang" : "dibuat" });
  }
  revalidatePath("/kalender");
  return { ok: baru ? "Tautan lama dinonaktifkan; tautan baru dibuat." : "Tautan kalender siap.", url: `${await dasar()}/api/kalender/${token}.ics` };
}

/** Kirim tautan langganan + undangan .ics (30 hari ke depan) ke email pengguna terdaftar. */
export async function kirimKeEmail(): Promise<StatusAksi> {
  const u = await pengguna();
  if (!u) return { error: "Masuk terlebih dahulu." };
  if (!emailSiap()) return { error: "Pengiriman email belum diaktifkan (SMTP belum diatur)." };
  const t = await buatTautanKalender(false);
  const d = await dasar();
  const acara = await acaraKalender(new Date(), new Date(Date.now() + 30 * HARI), u.peran === "Viewer" ? (await prisma.unitKerja.findUnique({ where: { id: u.unitKerjaId ?? 0 } }))?.nama ?? null : null);
  const ics = keIcs(acara, { nama: "STARS — Pemeliharaan 30 hari", dasar: d });
  const gcal = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(t!.url!.replace(/^https?:/, "webcal:"))}`;
  try {
    await kirimEmail(u.email, "Kalender pemeliharaan STARS",
      `Halo ${u.nama},\n\nTautkan jadwal pemeliharaan & perbaikan STARS ke Google Calendar:\n1) Buka: ${gcal}\n   atau di Google Calendar > Setelan > Tambahkan kalender > Dari URL, tempel: ${t!.url}\n2) Jadwal akan diperbarui otomatis.\n\nTerlampir berkas .ics berisi ${acara.length} acara 30 hari ke depan (bisa langsung diimpor).\n\nJangan bagikan tautan ini — berisi token pribadi Anda.\n\nSTARS RSUD Cipayung`,
      `<p>Halo ${u.nama.replace(/[<>&"]/g, "")},</p><p>Tautkan jadwal pemeliharaan &amp; perbaikan STARS ke Google Calendar:</p><p><a href="${gcal}" style="display:inline-block;background:#0B2545;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Tambahkan ke Google Calendar</a></p><p style="font-size:13px">Atau di Google Calendar › Setelan › <b>Tambahkan kalender › Dari URL</b>, tempel:<br><code>${t!.url}</code></p><p style="font-size:13px">Terlampir berkas .ics berisi ${acara.length} acara 30 hari ke depan.</p><p style="color:#64748b;font-size:12px">Jangan bagikan tautan ini — berisi token pribadi Anda.</p>`,
      [{ filename: "stars-pemeliharaan.ics", content: ics, contentType: "text/calendar; charset=utf-8" }]);
  } catch { return { error: "Email gagal dikirim (periksa pengaturan SMTP)." }; }
  await audit("kalender.email", { email: u.email, ip: ipDari(await headers()), detail: `${acara.length} acara` });
  return { ok: `Terkirim ke ${u.email}. Buka email itu lalu tekan "Tambahkan ke Google Calendar".`, url: t!.url };
}
