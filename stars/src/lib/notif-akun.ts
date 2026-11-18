/**
 * Notifikasi email seputar akun (server saja). Tidak pernah menggagalkan proses utama:
 * bila SMTP belum diatur atau gagal, hanya dicatat di log server.
 */
import { prisma } from "./prisma";
import { emailSiap, kirimEmail } from "./email";

const aman = (s: string) => s.replace(/[<>&"]/g, "");
const tombol = (href: string, teks: string) => `<p><a href="${href}" style="display:inline-block;background:#0B2545;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${teks}</a></p>`;
const kaki = "STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit • RSUD Cipayung";

/** Ke semua Admin & Super Admin aktif: ada pendaftar baru yang menunggu persetujuan. */
export async function notifAdminPendaftar(p: { nama: string; email: string; unit: string | null; catatan: string | null }, dasar: string | null) {
  if (!emailSiap()) return;
  try {
    const admin = await prisma.pengguna.findMany({ where: { aktif: true, peran: { in: ["Admin", "Super Admin"] } }, select: { email: true } });
    if (!admin.length) return;
    const url = dasar ? `${dasar}/admin/pengguna` : null;
    const teks = `Pendaftar baru STARS menunggu persetujuan:\n\nNama : ${p.nama}\nEmail: ${p.email}\nUnit : ${p.unit ?? "-"}\nCatatan: ${p.catatan ?? "-"}\n\n${url ? `Setujui atau tolak di: ${url}` : "Buka ADMIN › Pengguna untuk menyetujui atau menolak."}\n\n${kaki}`;
    const html = `<p>Pendaftar baru STARS menunggu persetujuan:</p><table style="font-size:14px"><tr><td>Nama</td><td><b>${aman(p.nama)}</b></td></tr><tr><td>Email</td><td>${aman(p.email)}</td></tr><tr><td>Unit</td><td>${aman(p.unit ?? "-")}</td></tr><tr><td>Catatan</td><td>${aman(p.catatan ?? "-")}</td></tr></table>${url ? tombol(url, "Buka ADMIN › Pengguna") : "<p>Buka ADMIN › Pengguna untuk menyetujui atau menolak.</p>"}<p style="color:#64748b;font-size:12px">${kaki}</p>`;
    for (const a of admin) await kirimEmail(a.email, `Pendaftar baru STARS: ${p.nama}`, teks, html).catch((e) => console.error("[notif-akun] admin:", e instanceof Error ? e.message : e));
  } catch (e) { console.error("[notif-akun] pendaftar:", e instanceof Error ? e.message : e); }
}

/** Ke pendaftar: akun disetujui (atau ditolak). */
export async function notifHasilPendaftaran(p: { nama: string; email: string; disetujui: boolean; peran?: string }, dasar: string | null) {
  if (!emailSiap()) return;
  try {
    const url = dasar ? `${dasar}/login` : null;
    if (p.disetujui) {
      await kirimEmail(p.email, "Akun STARS Anda sudah aktif",
        `Halo ${p.nama},\n\nAkun STARS Anda telah disetujui Admin dengan peran ${p.peran ?? "Viewer"}. Silakan masuk memakai email dan sandi yang Anda buat saat mendaftar.${url ? `\n\nMasuk: ${url}` : ""}\n\n${kaki}`,
        `<p>Halo ${aman(p.nama)},</p><p>Akun STARS Anda telah <b>disetujui</b> Admin dengan peran <b>${aman(p.peran ?? "Viewer")}</b>. Silakan masuk memakai email dan sandi yang Anda buat saat mendaftar.</p>${url ? tombol(url, "Masuk ke STARS") : ""}<p style="color:#64748b;font-size:12px">${kaki}</p>`);
    } else {
      await kirimEmail(p.email, "Pendaftaran akun STARS",
        `Halo ${p.nama},\n\nMohon maaf, pendaftaran akun STARS Anda belum dapat disetujui. Hubungi Instalasi Elektromedik RSUD Cipayung untuk informasi lebih lanjut.\n\n${kaki}`,
        `<p>Halo ${aman(p.nama)},</p><p>Mohon maaf, pendaftaran akun STARS Anda belum dapat disetujui. Hubungi Instalasi Elektromedik RSUD Cipayung untuk informasi lebih lanjut.</p><p style="color:#64748b;font-size:12px">${kaki}</p>`);
    }
  } catch (e) { console.error("[notif-akun] hasil:", e instanceof Error ? e.message : e); }
}
