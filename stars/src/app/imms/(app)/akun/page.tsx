import { sesiImms, PERAN_IMMS } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { emailSiap } from "@/lib/email";
import { bacaPref, waSiap } from "@/lib/notif-kirim";
import { keluar } from "@/app/login/actions";
import { UbahSandi } from "@/app/akun/ubah-sandi";
import { AturNotifikasi } from "@/app/akun/atur-notifikasi";

export const metadata = { title: "Akun Saya" };

export default async function AkunEmas() {
  const s = await sesiImms();
  const u = await prisma.pengguna.findUnique({ where: { email: s.user.email! }, select: { id: true, nama: true, email: true, unitKerja: { select: { nama: true } } } });
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
      <section className="kaca panel"><h2>Ganti sandi</h2><UbahSandi /></section>
      <form action={keluar}><button className="kapsul" type="submit">Keluar</button></form>
    </div>
  );
}
