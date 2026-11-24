import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { AMBANG_EM, fmtTgl, fmtRp, hitungEm, kerusakanPerAlat, labelInterval } from "@/lib/imms";
import { FUNGSI_ALAT, RISIKO_FISIK, KEBUTUHAN_PEMELIHARAAN, faktorRiwayat } from "@/lib/risiko-who";
import { simpanEm, buatInspeksiAlat } from "@/app/imms/actions";
import { Lencana } from "@/components/imms/ui";

export default async function Detail({ params }: { params: Promise<{ kode: string }> }) {
  const kode = decodeURIComponent((await params).kode);
  const s = await auth();
  const a = await prisma.alat.findUnique({
    where: { kode },
    include: {
      unitKerja: true, ruangan: true,
      perintah: { orderBy: { createdAt: "desc" }, take: 20 },
      jadwal: { where: { aktif: true } },
      kalibrasi: { orderBy: { tanggal: "desc" }, take: 5 },
      riwayatEm: { orderBy: { waktu: "desc" }, take: 10 },
    },
  });
  if (!a) notFound();
  if (s?.user.peran === "Viewer" && s.user.unitKerjaId && s.user.unitKerjaId !== a.unitKerjaId) notFound();
  const teknisi = cukup(s?.user.peran, "Operator");
  const e = hitungEm(a, (await kerusakanPerAlat([a.id])).get(a.id) ?? 0);
  const h = await headers();
  const asal = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const qr = await QRCode.toDataURL(`${asal}/imms/inventaris/${encodeURIComponent(a.kode)}`, { margin: 1, width: 220 });
  const kal = a.kalibrasi[0];
  const baris = (k: string, v: React.ReactNode) => <div className="flex gap-3 py-1.5 text-[13px]"><dt className="redup w-40 shrink-0">{k}</dt><dd className="min-w-0 flex-1">{v ?? "—"}</dd></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/imms/inventaris" className="tautan text-[13px]">‹ Inventaris</Link>
        <h2 className="text-lg font-bold">{a.nama}</h2><Lencana t={a.kondisi} /><Lencana t={a.statusOperasi} nada={a.statusOperasi === "Beroperasi" ? "hijau" : "merah"} />
        <div className="ml-auto flex flex-wrap gap-2">
          <a className="kapsul" href={`/api/admin/alat/label?id=${a.id}`} target="_blank" rel="noopener">Cetak label QR</a>
          <Link className="kapsul" href={`/imms/keluhan?alat=${a.id}`}>Laporkan kerusakan</Link>
          {teknisi && <form action={buatInspeksiAlat}><input type="hidden" name="alatId" value={a.id} /><button className="kapsul utama">Inspeksi sekarang</button></form>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="kaca panel lg:col-span-2" aria-label="Identitas alat">
          <h2>Identitas & lokasi</h2>
          <dl className="grid md:grid-cols-2 md:gap-x-6">
            {baris("Kode / ID unik", a.kode)}{baris("Nama baku (IKATEMI)", a.ikatemiNama)}
            {baris("Merek", a.merek)}{baris("Tipe / model", a.model)}
            {baris("Nomor seri", a.nomorSeri)}{baris("Produsen", a.produsen)}
            {baris("Unit kerja", a.unitKerja.nama)}{baris("Ruangan", a.ruangan?.nama ?? a.lokasi)}
            {baris("Tahun perolehan", a.tahunPerolehan)}{baris("Harga perolehan", fmtRp(a.hargaPerolehan))}
            {baris("Status kepemilikan / pendanaan", a.pendanaan)}{baris("Kelas risiko", a.kelasRisiko ?? a.risiko)}
            {baris("Kalibrasi terakhir", kal ? <>{fmtTgl(kal.tanggal)} · <Lencana t={kal.laik ? "Laik" : "Tidak laik"} /> s.d. {fmtTgl(kal.berlakuSampai)}</> : "Belum ada")}
            {baris("Penyedia servis", a.penyediaServis)}
          </dl>
        </section>
        <section className="kaca panel text-center" aria-label="Kode QR">
          <h2>Kode QR</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR ${a.kode}`} className="mx-auto h-44 w-44 rounded-xl bg-white p-2" />
          <p className="redup2 mt-2 text-[12px]">Pindai untuk membuka kartu alat ini.</p>
        </section>
      </div>
      <section className="kaca panel" aria-label="Nilai EM">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="!mb-0">Nilai Equipment Management</h2>
          <span className="redup2 text-[12px]">EM = F + A + M + H (Permenkes 65/2016)</span>
          <span className="ml-auto angka" style={{ color: e.total != null && e.total >= AMBANG_EM ? "var(--aksen)" : undefined }}>{e.total ?? "—"}</span>
        </div>
        <p className="redup mb-3 text-[13px]">
          {e.total == null ? "Belum dinilai." : e.total >= AMBANG_EM ? `Masuk program inspeksi terjadwal — ${labelInterval(e.interval)}.` : `Di bawah ${AMBANG_EM}: tidak dijadwalkan, dipantau saat pakai.`}
          {" "}H = {e.h} ({faktorRiwayat(e.kerusakan).label}; {e.kerusakan} perbaikan dalam 30 bulan).
        </p>
        {teknisi ? (
          <form action={simpanEm} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="alatId" value={a.id} />
            <div><label className="lbl" htmlFor="f">Fungsi alat (F)</label><select id="f" name="f" defaultValue={a.emFungsi ?? ""} required><option value="" disabled>Pilih…</option>{FUNGSI_ALAT.map((p) => <option key={p.nilai} value={p.nilai}>{p.nilai} — {p.label}</option>)}</select></div>
            <div><label className="lbl" htmlFor="a">Risiko aplikasi (A)</label><select id="a" name="a" defaultValue={a.emRisiko ?? ""} required><option value="" disabled>Pilih…</option>{RISIKO_FISIK.map((p) => <option key={p.nilai} value={p.nilai}>{p.nilai} — {p.label}</option>)}</select></div>
            <div><label className="lbl" htmlFor="m">Kebutuhan pemeliharaan (M)</label><select id="m" name="m" defaultValue={a.emPemeliharaan ?? ""} required><option value="" disabled>Pilih…</option>{KEBUTUHAN_PEMELIHARAAN.map((p) => <option key={p.nilai} value={p.nilai}>{p.nilai} — {p.label}</option>)}</select></div>
            <div className="flex items-end"><button className="kapsul utama w-full">Simpan & hitung EM</button></div>
          </form>
        ) : <p className="redup text-[13px]">F {e.f ?? "—"} · A {e.a ?? "—"} · M {e.m ?? "—"} · H {e.h}</p>}
        {a.riwayatEm.length > 0 && (
          <details className="mt-3 text-[13px]"><summary className="tautan cursor-pointer">Riwayat nilai EM ({a.riwayatEm.length})</summary>
            <table className="tabel mt-2"><thead><tr><th>Waktu</th><th>F</th><th>A</th><th>M</th><th>H</th><th>EM</th><th>Frekuensi</th><th>Sebab</th></tr></thead>
              <tbody>{a.riwayatEm.map((r) => <tr key={r.id}><td>{fmtTgl(r.waktu)}</td><td>{r.fungsi}</td><td>{r.aplikasi}</td><td>{r.pemeliharaan}</td><td>{r.riwayat}</td><td className="font-semibold">{r.total}</td><td>{labelInterval(r.intervalBulan)}</td><td className="redup">{r.sebab}</td></tr>)}</tbody></table>
          </details>
        )}
      </section>
      <section className="kaca panel" aria-label="Riwayat pekerjaan">
        <h2>Riwayat pekerjaan</h2>
        {a.jadwal.map((j) => <p key={j.id} className="mb-2 text-[13px]">Jadwal: <b>{j.nama}</b> tiap {j.intervalHari} hari · berikutnya <b>{fmtTgl(j.berikutnya)}</b></p>)}
        {a.perintah.length === 0 ? <p className="redup text-[13px]">Belum ada perintah kerja.</p> : (
          <table className="tabel"><thead><tr><th>Nomor</th><th>Jenis</th><th>Uraian</th><th>Status</th><th>Uji fungsi</th><th>Tanggal</th></tr></thead>
            <tbody>{a.perintah.map((w) => <tr key={w.id}><td><Link className="tautan" href={`/imms/perbaikan/${w.nomor}`}>{w.nomor}</Link></td><td><Lencana t={w.jenis} /></td><td className="max-w-[320px] truncate">{w.deskripsi}</td><td><Lencana t={w.status} /></td><td><Lencana t={w.ujiFungsi} /></td><td className="redup whitespace-nowrap">{fmtTgl(w.createdAt)}</td></tr>)}</tbody></table>
        )}
      </section>
    </div>
  );
}
