import { auth } from "@/auth";
import { PERAN_IMMS } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { ImmsShell } from "@/components/imms/shell";

export const dynamic = "force-dynamic";

/**
 * Kerangka EMASCARE. Tanpa login hanya Beranda (ringkasan angka) yang terbuka, seperti dasbor publik STARS;
 * setiap halaman data memanggil sesiImms() sendiri sehingga pengunjung dialihkan ke halaman masuk.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  if (!s?.user) return <ImmsShell publik tingkat={-1} nama="Pengunjung" peran="Tanpa akun" menunggu={0}>{children}</ImmsShell>;
  const menunggu = await prisma.perintahKerja.count({ where: { usulanStatus: "Diajukan" } });
  return (
    <ImmsShell tingkat={cukup(s.user.peran, "Admin") ? 2 : cukup(s.user.peran, "Operator") ? 1 : 0} nama={s.user.nama} peran={PERAN_IMMS[s.user.peran] ?? s.user.peran} menunggu={menunggu}>
      {children}
    </ImmsShell>
  );
}
