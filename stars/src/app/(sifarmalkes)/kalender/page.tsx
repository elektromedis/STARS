import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { acaraKalender, tautanGoogle } from "@/lib/kalender";
import { normalAlamat, asalPermintaan } from "@/lib/alamat";
import { KalenderKlien } from "./kalender-klien";

export const metadata: Metadata = { title: "Kalender Pemeliharaan" };
export const dynamic = "force-dynamic";

export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const kini = new Date(Date.now() + 7 * 3_600_000); // WIB
  const m = /^(\d{4})-(\d{2})$/.exec(sp.bulan ?? "");
  const th = m ? Number(m[1]) : kini.getUTCFullYear(), bl = m ? Number(m[2]) - 1 : kini.getUTCMonth();
  const awal = new Date(Date.UTC(th, bl, 1) - 7 * 86_400_000), akhir = new Date(Date.UTC(th, bl + 1, 1) + 14 * 86_400_000);
  const [kunci, sesi] = await Promise.all([unitTerkunci(), auth()]);
  const dasar = normalAlamat(process.env.STARS_URL_PUBLIK) ?? asalPermintaan(await headers(), "");
  const acara = (await acaraKalender(awal, akhir, kunci?.nama ?? null)).map((a) => ({ ...a, google: tautanGoogle(a, dasar) }));
  const u = sesi?.user?.email ? await prisma.pengguna.findUnique({ where: { email: sesi.user.email }, select: { email: true, tokenKalender: true } }) : null;
  return (
    <KalenderKlien tahun={th} bulan={bl} acara={acara}
      akun={u ? { email: u.email, url: u.tokenKalender ? `${dasar}/api/kalender/${u.tokenKalender}.ics` : null } : null} />
  );
}
