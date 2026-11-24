import { sesiImms, PERAN_IMMS } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { ImmsShell } from "@/components/imms/shell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await sesiImms();
  const menunggu = await prisma.perintahKerja.count({ where: { usulanStatus: "Diajukan" } });
  return (
    <ImmsShell tingkat={cukup(s.user.peran, "Admin") ? 2 : cukup(s.user.peran, "Operator") ? 1 : 0} nama={s.user.nama} peran={PERAN_IMMS[s.user.peran] ?? s.user.peran} menunggu={menunggu}>
      {children}
    </ImmsShell>
  );
}
