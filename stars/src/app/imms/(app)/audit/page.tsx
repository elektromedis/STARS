import { prisma } from "@/lib/prisma";
import { sesiImms } from "@/lib/imms-sesi";
import { Kosong, Tabel } from "@/components/imms/ui";

export default async function Audit() {
  await sesiImms("Admin");
  const log = await prisma.auditLog.findMany({ where: { aksi: { startsWith: "IMMS:" } }, orderBy: { waktu: "desc" }, take: 300 });
  const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
  return log.length === 0 ? <div className="kaca panel"><Kosong>Belum ada aktivitas IMMS.</Kosong></div> : (
    <Tabel><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>Detail</th></tr></thead>
      <tbody>{log.map((l) => <tr key={l.id}><td className="whitespace-nowrap redup">{fmt.format(l.waktu)}</td><td>{l.email ?? "—"}</td><td>{l.aksi.replace(/^IMMS:\s*/, "")}</td><td>{l.objek ?? "—"}</td><td className="redup">{l.detail ?? ""}</td></tr>)}</tbody></Tabel>
  );
}
