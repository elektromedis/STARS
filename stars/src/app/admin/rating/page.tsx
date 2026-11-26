import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { inp, tgl } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { beriRating, setujuiWo } from "./actions";

export const metadata: Metadata = { title: "Rating & Persetujuan Perintah Kerja" };
export const dynamic = "force-dynamic";

export default async function RatingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet", adm = cukup(se.user.peran, "Admin") && process.env.STARS_MODE !== "internet";
  const filter = sp.f === "nilai" ? { rating: null } : sp.f === "setuju" ? { disetujuiPada: null } : {};
  const kunci = await unitTerkunci();
  const wo = await prisma.perintahKerja.findMany({ where: { status: "Selesai", ...filter, ...(kunci ? { alat: { unitKerja: { nama: kunci.nama } } } : {}) }, orderBy: { tanggalSelesai: "desc" }, take: 150, include: { alat: { select: { kode: true, nama: true } }, teknisi: { select: { nama: true } } } });
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Rating &amp; Persetujuan Perintah Kerja</CardTitle><CardDescription>Perintah kerja berstatus Selesai: pengguna/kepala ruangan memberi rating 1–5, lalu Admin menyetujui hasilnya. Nilai dipakai pada <Link className="underline" href="/admin/kinerja">Kinerja Pemeliharaan</Link>.</CardDescription>
          <nav className="flex gap-1 pt-2 text-sm">{[["", "Semua"], ["nilai", "Belum dinilai"], ["setuju", "Belum disetujui"]].map(([k, l]) => <Link key={k} href={k ? `/admin/rating?f=${k}` : "/admin/rating"} className={`rounded-lg px-3 py-1 ${(sp.f ?? "") === k ? "bg-teal-600 text-white" : "hover:bg-muted"}`}>{l}</Link>)}</nav></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">WO</th><th>Alat</th><th>Teknisi</th><th>Selesai</th><th>Rating</th><th>Persetujuan</th></tr></thead>
          <tbody>{wo.map((w) => <tr key={w.id} className="border-b align-top"><td className="py-2 font-medium">{w.nomor}<div className="text-xs font-normal text-muted-foreground">{w.jenis}</div></td><td>{w.alat ? `${w.alat.kode} · ${w.alat.nama}` : "—"}</td><td>{w.teknisi?.nama ?? "—"}</td><td>{tgl(w.tanggalSelesai)}</td>
            <td>{w.rating ? <span title={w.ratingCatatan ?? ""}>{"★".repeat(w.rating)}{"☆".repeat(5 - w.rating)} <span className="text-xs text-muted-foreground">{w.ratingOleh}</span></span> : op ? <form action={beriRating} className="flex items-center gap-1"><input type="hidden" name="id" value={w.id} /><select name="rating" className="h-8 rounded-md border bg-white px-1 text-sm">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}</select><input name="catatan" placeholder="catatan" className={`${inp} w-32`} /><Button size="sm" variant="outline">Nilai</Button></form> : "—"}</td>
            <td>{w.disetujuiPada ? <span className="text-emerald-800">Disetujui {tgl(w.disetujuiPada)} <span className="text-xs text-muted-foreground">{w.disetujuiOleh}</span>{adm && <form action={setujuiWo} className="inline"><input type="hidden" name="id" value={w.id} /><input type="hidden" name="aksi" value="batal" /> <button className="text-xs text-red-700 hover:underline">batalkan</button></form>}</span> : adm ? <form action={setujuiWo}><input type="hidden" name="id" value={w.id} /><Button size="sm" variant="teal">Setujui</Button></form> : "Menunggu"}</td></tr>)}
            {!wo.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Tidak ada perintah kerja selesai.</td></tr>}</tbody></table></CardContent>
      </Card>
    </div>
  );
}
