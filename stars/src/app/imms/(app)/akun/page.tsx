import { sesiImms, PERAN_IMMS } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { emailSiap } from "@/lib/email";
import { bacaPref, waSiap } from "@/lib/notif-kirim";
import { keluarImms as keluar, aturModeDosen } from "@/app/imms/actions";
import { UbahSandi } from "@/app/akun/ubah-sandi";
import { AturNotifikasi } from "@/app/akun/atur-notifikasi";
import { TautanTamu } from "@/components/imms/tautan-tamu";
import { statusDosen, statusTamu } from "@/lib/tamu";

export const metadata = { title: "Akun Saya" };

export default async function AkunEmas() {
  const s = await sesiImms();
  const u = await prisma.pengguna.findUnique({ where: { email: s.user.email! }, select: { id: true, nama: true, email: true, unitKerja: { select: { nama: true } } } });
  const admin = cukup(s.user.peran, "Admin");
  const tamu = admin ? await statusTamu() : undefined;
  const dosen = admin ? await statusDosen() : null;
  const pref = u && cukup(s.user.peran, "Operator") ? await bacaPref(u.id) : null;
  return (
    <div className="space-y-5">
      <section className="kaca panel">
        <h2>{u?.nama ?? s.user.nama}</h2>
        <p className="redup text-[13px]">{u?.email} · {PERAN_IMMS[s.user.peran] ?? s.user.peran}{u?.unitKerja ? ` · ${u.unitKerja.nama}` : ""}</p>
      </section>
      {pref && (
        <section className="kaca panel">
          <h2>Notifikasi email &amp; WhatsApp</h2>
          <p className="redup mb-3 text-[12px]">Ringkasan perubahan data oleh orang lain di STARS, EMASCARE, dan hasil sinkron TRILUX.</p>
          <AturNotifikasi email={pref.email} wa={pref.wa} emailSiap={emailSiap()} waSiap={waSiap()} />
        </section>
      )}
      {admin && (
        <section className="kaca panel">
          <h2>Mode Dosen Pembimbing</h2>
          <p className="redup mb-3 text-[12px]">Saat aktif, siapa pun yang membuka alamat EMASCARE langsung masuk ke <b>Dashboard Dosen Pembimbing</b>: melihat semua fitur, tanpa akun, tanpa bisa mengubah data, dan tanpa akses STARS. Matikan setelah bimbingan/ujian selesai.</p>
          {dosen ? (
            <form action={aturModeDosen} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span>Aktif sampai <b>{new Date(dosen.sampai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</b></span>
              <input type="hidden" name="hari" value="0" /><button className="kapsul">Matikan sekarang</button>
            </form>
          ) : (
            <form action={aturModeDosen} className="flex flex-wrap items-end gap-2">
              <div><label className="lbl" htmlFor="hari-dosen">Aktif selama</label>
                <select id="hari-dosen" name="hari" defaultValue="7">{[1, 3, 7, 14, 30].map((h) => <option key={h} value={h}>{h} hari</option>)}</select></div>
              <button className="kapsul utama">Aktifkan</button>
            </form>
          )}
        </section>
      )}
      {tamu !== undefined && <section className="kaca panel"><h2>Tautan pratinjau tanpa akun</h2><TautanTamu aktif={tamu} /></section>}
      {u && <section className="kaca panel"><h2>Ganti sandi</h2><UbahSandi /></section>}
      <form action={keluar}><button className="kapsul" type="submit">Keluar</button></form>
    </div>
  );
}
