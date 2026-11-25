import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Kolom barcode: hasil pemindai (USB/kamera) atau ketikan kode → buka detail alat bila tepat satu cocok. */
export default async function Pindai({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  let k = ((await searchParams).k ?? "").trim().slice(0, 300);
  try { const u = new URL(k); k = u.searchParams.get("kode") ?? u.searchParams.get("alat") ?? decodeURIComponent(u.pathname.split("/").pop() ?? k); } catch { /* bukan URL */ }
  if (!k) redirect("/imms/inventaris");
  const cocok = await prisma.alat.findMany({ where: { OR: [{ kode: k }, { nomorSeri: k }, { kodeAspak: k }, { noUrutAset: k }, { udi: k }] }, select: { kode: true }, take: 2 });
  redirect(cocok.length === 1 ? `/imms/inventaris/${encodeURIComponent(cocok[0].kode)}` : `/imms/inventaris?q=${encodeURIComponent(k)}`);
}
