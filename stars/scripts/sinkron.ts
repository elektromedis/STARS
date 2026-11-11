/**
 * Mengirim seluruh data paket dari server INI (intranet) ke server internet.
 * Jalankan: npm run sync      (butuh SYNC_URL dan SYNC_TOKEN di .env)
 * Jadwalkan harian lewat Task Scheduler (Windows) atau cron (Linux). Lihat docs/TAHAPAN-PENGEMBANGAN.md §3.3.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = process.env.SYNC_URL?.replace(/\/$/, "");
  const token = process.env.SYNC_TOKEN;
  if (!url || !token) throw new Error("Isi SYNC_URL (mis. https://stars.domain-rs.go.id) dan SYNC_TOKEN di .env");

  const rows = await prisma.paket.findMany({ include: { unitKerja: true }, orderBy: { id: "asc" } });
  const paket = rows.map(({ id: _id, unitKerjaId: _u, createdAt: _c, updatedAt: _m, unitKerja, ...p }) => { void _id; void _u; void _c; void _m; return { ...p, unitKerja: unitKerja.nama }; });
  console.log(`Mengirim ${paket.length} paket ke ${url}/api/sync ...`);

  const res = await fetch(`${url}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paket, sumber: process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? "intranet" }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Server menjawab ${res.status}: ${body.slice(0, 500)}`);
  console.log("Selesai:", body);
}

main()
  .catch((e) => { console.error("Sinkron GAGAL:", e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
