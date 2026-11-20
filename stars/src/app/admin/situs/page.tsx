import type { Metadata } from "next";
import { Megaphone, PanelTop } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { bacaInfoSitus } from "@/lib/situs-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { simpanInfo, tambahPengumuman, ubahPengumuman } from "./actions";

export const metadata: Metadata = { title: "CMS Situs" };
export const dynamic = "force-dynamic";
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
const L = "grid gap-1 text-sm";

export default async function SitusPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await sesiHalaman("Admin");
  const sp = await searchParams;
  const [info, daftar] = await Promise.all([bacaInfoSitus(), prisma.pengumuman.findMany({ orderBy: [{ urut: "asc" }, { id: "desc" }] })]);
  const grupTeks = info.grup.map((g) => [`## ${g.judul}${g.judulEn ? ` | ${g.judulEn}` : ""}`, ...g.tautan.map((t) => [t.label, t.labelEn, t.href].filter(Boolean).join(" | "))].join("\n")).join("\n");
  const tgl = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) : "—");
  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="size-5 text-teal-700" /> Iklan / pengumuman pop-up</CardTitle>
          <CardDescription>Tampil di beranda sekali per sesi, dengan tombol Tutup. Gambar potret (mis. 1080×1350 px, JPG/PNG/WEBP ≤ 3 MB). Jadwal tampil opsional.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <form action={tambahPengumuman} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
            <label className={`${L} sm:col-span-2`}>Judul (teks alternatif untuk pembaca layar)<input name="judul" required maxLength={120} className={inp} /></label>
            <label className={L}>Urutan<input name="urut" type="number" defaultValue={0} className={inp} /></label>
            <label className={L}>Gambar<input name="gambar" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></label>
            <label className={L}>Tautan saat diklik (opsional)<input name="tautan" placeholder="/lapor atau https://…" className={inp} /></label>
            <span />
            <label className={L}>Mulai tampil<input name="mulai" type="date" className={inp} /></label>
            <label className={L}>Selesai tampil<input name="selesai" type="date" className={inp} /></label>
            <Button variant="teal" className="self-end">Tambah pengumuman</Button>
          </form>
          {daftar.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.gambar ? <img src={`/api/situs/gambar/${p.gambar}`} alt="" className="h-16 w-12 rounded object-cover" /> : <span className="grid h-16 w-12 place-items-center rounded bg-slate-100 text-xs">—</span>}
              <span className="min-w-0 flex-1"><b>{p.judul}</b><br /><span className="text-xs text-muted-foreground">{p.aktif ? "Aktif" : "Nonaktif"} · {tgl(p.mulai)} – {tgl(p.selesai)}{p.tautan ? ` · ${p.tautan}` : ""}</span></span>
              <form action={ubahPengumuman} className="flex gap-1"><input type="hidden" name="id" value={p.id} />
                <Button size="sm" variant="outline" name="aksi" value="aktif">{p.aktif ? "Nonaktifkan" : "Aktifkan"}</Button>
                <Button size="sm" variant="outline" name="aksi" value="hapus">Hapus</Button></form>
            </div>))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PanelTop className="size-5 text-teal-700" /> Bilah situs (atas, kontak, tautan, bantuan)</CardTitle>
          <CardDescription>Bilah atas (alamat · telepon), bagian kontak di bawah halaman dengan peta, media sosial, unduh aplikasi, grup tautan lipat, dan tombol Bantuan (WhatsApp).</CardDescription></CardHeader>
        <CardContent>
          <form action={simpanInfo} className="grid gap-3 sm:grid-cols-2">
            <label className={`${L} sm:col-span-2`}>Alamat<input name="alamat" defaultValue={info.alamat} className={inp} /></label>
            <label className={L}>Telepon<input name="telepon" defaultValue={info.telepon} className={inp} placeholder="(021) …" /></label>
            <label className={L}>WhatsApp (angka, awali 62)<input name="whatsapp" defaultValue={info.whatsapp} className={inp} placeholder="62812…" /></label>
            <label className={L}>Email<input name="email" type="email" defaultValue={info.email} className={inp} /></label>
            <label className={L}>Teks tombol bantuan<input name="bantuanTeks" defaultValue={info.bantuanTeks} className={inp} /></label>
            <label className={`${L} sm:col-span-2`}>Tautan peta (Google Maps — tombol Bagikan › Sematkan peta, salin isi src)<input name="peta" defaultValue={info.peta} className={inp} placeholder="https://www.google.com/maps/embed?pb=…" /></label>
            {(["facebook", "instagram", "x", "youtube", "tiktok"] as const).map((k) => <label key={k} className={L}>{k[0].toUpperCase() + k.slice(1)}<input name={k} defaultValue={info.sosial[k] ?? ""} className={inp} placeholder="https://…" /></label>)}
            <label className={L}>Aplikasi Android (Google Play)<input name="aplikasiAndroid" defaultValue={info.aplikasiAndroid ?? ""} className={inp} /></label>
            <label className={L}>Aplikasi iOS (App Store)<input name="aplikasiIos" defaultValue={info.aplikasiIos ?? ""} className={inp} /></label>
            <label className={`${L} sm:col-span-2`}>Grup tautan lipat — baris <code>## Judul | Judul EN</code> lalu <code>Label | Label EN | /tautan</code>
              <textarea name="grup" rows={8} defaultValue={grupTeks} className="rounded-md border px-2 py-1 font-mono text-xs" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tampilBilahAtas" defaultChecked={info.tampilBilahAtas} /> Tampilkan bilah atas (alamat · telepon)</label>
            <Button variant="teal" className="justify-self-start sm:col-span-2">Simpan bilah situs</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
