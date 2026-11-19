/**
 * Kalender pemeliharaan & perbaikan (gaya Google Calendar) — server saja.
 * Sumber: jadwal preventif (berulang), perintah kerja, jatuh tempo kalibrasi, batas pengembalian peminjaman, akhir kontrak servis.
 * Bisa diekspor sebagai iCalendar (.ics) untuk Google Calendar ("Tambahkan dari URL") atau undangan email.
 */
import { prisma } from "./prisma";

import type { Acara } from "./kalender-warna";
export type { Acara, JenisAcara } from "./kalender-warna";
const HARI = 86_400_000;
const iso = (d: Date) => d.toISOString();

export async function acaraKalender(dari: Date, sampai: Date, unit: string | null): Promise<Acara[]> {
  const fu = unit ? { unitKerja: { nama: unit } } : {};
  const [jadwal, wo, kal, pinjam, kontrak] = await Promise.all([
    prisma.jadwalPreventif.findMany({ where: { aktif: true, berikutnya: { not: null, lte: sampai }, alat: { aktif: true, ...fu } }, select: { id: true, nama: true, intervalHari: true, berikutnya: true, alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } } } }),
    prisma.perintahKerja.findMany({ where: { OR: [{ status: { in: ["Terbuka", "Dikerjakan"] } }, { tanggalSelesai: { gte: dari } }], createdAt: { lte: sampai }, ...(unit ? { alat: fu } : {}) }, select: { id: true, nomor: true, jenis: true, status: true, deskripsi: true, createdAt: true, tanggalMulai: true, tanggalSelesai: true, alat: { select: { nama: true, unitKerja: { select: { nama: true } } } } } }),
    prisma.kalibrasi.findMany({ where: { berlakuSampai: { gte: dari, lte: sampai }, alat: { aktif: true, ...fu } }, orderBy: { tanggal: "desc" }, select: { id: true, alatId: true, berlakuSampai: true, alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } } } }),
    prisma.peminjaman.findMany({ where: { status: { in: ["Disetujui", "Dipinjam"] }, rencanaKembali: { gte: dari, lte: sampai } }, select: { id: true, nomor: true, rencanaKembali: true, tanggalPinjam: true, status: true, peminjam: true } }),
    prisma.alat.findMany({ where: { aktif: true, kontrakServisSampai: { gte: dari, lte: sampai }, ...fu }, select: { id: true, kode: true, nama: true, kontrakServisSampai: true, penyediaServis: true } }),
  ]);
  const hasil: Acara[] = [];
  for (const j of jadwal) {
    const step = Math.max(1, j.intervalHari) * HARI;
    let t = j.berikutnya!.getTime();
    while (t < dari.getTime()) t += step;
    for (let n = 0; t <= sampai.getTime() && n < 60; t += step, n++) {
      hasil.push({ id: `pm-${j.id}-${n}`, judul: `PM: ${j.alat.nama}`, mulai: iso(new Date(t)), selesai: iso(new Date(t + HARI)), seharian: true, jenis: "Preventif", ket: `${j.nama} · ${j.alat.unitKerja.nama} · ulang tiap ${j.intervalHari} hari`, href: `/alat?kode=${encodeURIComponent(j.alat.kode)}`, status: n === 0 && j.berikutnya!.getTime() < Date.now() ? "Terlambat" : "Terjadwal" });
    }
  }
  for (const w of wo) {
    const m = w.tanggalMulai ?? w.createdAt;
    const s = w.tanggalSelesai ?? new Date(Math.max(Date.now(), m.getTime() + 3_600_000));
    hasil.push({ id: `wo-${w.id}`, judul: `${w.jenis === "Preventif" ? "PM" : "Perbaikan"}: ${w.alat?.nama ?? w.deskripsi.slice(0, 40)}`, mulai: iso(m), selesai: iso(s), seharian: false, jenis: w.jenis === "Preventif" ? "Preventif" : "Perbaikan", ket: `${w.nomor} · ${w.status}${w.alat ? ` · ${w.alat.unitKerja.nama}` : ""}`, href: "/admin/pemeliharaan", status: w.status });
  }
  const sudah = new Set<number>();
  for (const k of kal) {
    if (sudah.has(k.alatId)) continue; sudah.add(k.alatId);
    hasil.push({ id: `kal-${k.id}`, judul: `Kalibrasi jatuh tempo: ${k.alat.nama}`, mulai: iso(k.berlakuSampai!), selesai: iso(new Date(k.berlakuSampai!.getTime() + HARI)), seharian: true, jenis: "Kalibrasi", ket: `${k.alat.kode} · ${k.alat.unitKerja.nama}`, href: `/alat?kode=${encodeURIComponent(k.alat.kode)}` });
  }
  for (const p of pinjam) hasil.push({ id: `pj-${p.id}`, judul: `Batas kembali ${p.nomor}`, mulai: iso(p.rencanaKembali), selesai: iso(new Date(p.rencanaKembali.getTime() + HARI)), seharian: true, jenis: "Peminjaman", ket: `${p.peminjam} · ${p.status}`, href: "/peminjaman", status: p.status });
  for (const a of kontrak) hasil.push({ id: `ks-${a.id}`, judul: `Kontrak servis berakhir: ${a.nama}`, mulai: iso(a.kontrakServisSampai!), selesai: iso(new Date(a.kontrakServisSampai!.getTime() + HARI)), seharian: true, jenis: "Kontrak", ket: `${a.kode}${a.penyediaServis ? ` · ${a.penyediaServis}` : ""}`, href: `/alat?kode=${encodeURIComponent(a.kode)}` });
  return hasil.sort((a, b) => a.mulai.localeCompare(b.mulai));
}

// ---------------------------------------------------------------- iCalendar (RFC 5545)
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const tglIcs = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const wktIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const lipat = (baris: string) => { const out: string[] = []; let s = baris; while (s.length > 74) { out.push(s.slice(0, 74)); s = ` ${s.slice(74)}`; } out.push(s); return out.join("\r\n"); };

export function keIcs(acara: Acara[], o: { nama: string; dasar: string; metode?: "PUBLISH" | "REQUEST"; penerima?: string }) {
  const b = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//STARS RSUD Cipayung//Kalender Pemeliharaan//ID", "CALSCALE:GREGORIAN", `METHOD:${o.metode ?? "PUBLISH"}`, `X-WR-CALNAME:${esc(o.nama)}`, "X-WR-TIMEZONE:Asia/Jakarta", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"];
  const kini = wktIcs(new Date());
  for (const a of acara) {
    const m = new Date(a.mulai), s = new Date(a.selesai);
    b.push("BEGIN:VEVENT", `UID:${a.id}@stars-rsudcipayung`, `DTSTAMP:${kini}`,
      a.seharian ? `DTSTART;VALUE=DATE:${tglIcs(m)}` : `DTSTART:${wktIcs(m)}`,
      a.seharian ? `DTEND;VALUE=DATE:${tglIcs(s)}` : `DTEND:${wktIcs(s)}`,
      lipat(`SUMMARY:${esc(a.judul)}`), lipat(`DESCRIPTION:${esc(`${a.ket}\n${o.dasar}${a.href}`)}`), `CATEGORIES:${a.jenis}`, lipat(`URL:${o.dasar}${a.href}`));
    if (o.metode === "REQUEST") b.push("ORGANIZER;CN=STARS:mailto:noreply@stars.local", ...(o.penerima ? [`ATTENDEE;RSVP=TRUE;CN=${esc(o.penerima)}:mailto:${o.penerima}`] : []), "STATUS:CONFIRMED", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Pengingat STARS", "TRIGGER:-P1D", "END:VALARM");
    b.push("END:VEVENT");
  }
  b.push("END:VCALENDAR");
  return b.join("\r\n");
}

/** Tautan "Tambahkan ke Google Calendar" untuk satu acara (dibuka di akun Google pengguna). */
export function tautanGoogle(a: Acara, dasar: string) {
  const m = new Date(a.mulai), s = new Date(a.selesai);
  const tgl = a.seharian ? `${tglIcs(m)}/${tglIcs(s)}` : `${wktIcs(m)}/${wktIcs(s)}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: a.judul, dates: tgl, details: `${a.ket}\n${dasar}${a.href}`, ctz: "Asia/Jakarta" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
