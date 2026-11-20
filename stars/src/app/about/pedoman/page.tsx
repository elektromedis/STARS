import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileDown, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BAB, DASAR_UMUM, VERSI_PEDOMAN } from "@/lib/pedoman";

export const metadata: Metadata = { title: "Pedoman Penggunaan STARS" };

export default function PedomanPage() {
  const pustaka = [...new Set(BAB.flatMap((b) => b.referensi))].sort();
  return (
    <>
      <PageHeader title="Pedoman Penggunaan STARS" description={`Dasar hukum, SOP/alur penggunaan, dan referensi setiap fitur · ${VERSI_PEDOMAN}`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="teal" asChild><a href="/api/pedoman?format=pdf" target="_blank" rel="noopener"><FileDown /> Unduh PDF</a></Button>
        <Button variant="outline" asChild><a href="/api/pedoman?format=doc"><FileText /> Unduh Word (.doc)</a></Button>
        <Button variant="ghost" asChild><Link href="/about">← Kembali ke TENTANG SAYA</Link></Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-4 print:hidden"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" /> Daftar isi</CardTitle></CardHeader>
          <CardContent><ol className="grid gap-1 text-sm"><li><a href="#dasar-umum" className="hover:underline">Dasar hukum umum</a></li>{BAB.map((b, i) => <li key={b.id}><a href={`#${b.id}`} className="hover:underline">{i + 1}. {b.judul}</a></li>)}<li><a href="#pustaka" className="hover:underline">Daftar pustaka</a></li></ol></CardContent></Card>
        <div className="grid gap-4">
          <Card id="dasar-umum"><CardHeader><CardTitle>Dasar Hukum Umum</CardTitle></CardHeader><CardContent><ol className="list-decimal space-y-1 pl-5 text-sm">{DASAR_UMUM.map((d) => <li key={d}>{d}</li>)}</ol></CardContent></Card>
          {BAB.map((b, i) => (
            <Card key={b.id} id={b.id} className="scroll-mt-4">
              <CardHeader><CardTitle>{i + 1}. {b.judul}</CardTitle>
                <p className="text-sm text-muted-foreground"><b>Menu:</b> {b.menu}<br /><b>Tujuan:</b> {b.tujuan}<br /><b>Peran:</b> {b.peran}</p></CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div><p className="mb-1 font-semibold text-teal-800">Dasar hukum</p><ul className="list-disc space-y-1 pl-5">{b.dasar.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div><p className="mb-1 font-semibold text-teal-800">Referensi</p><ul className="list-disc space-y-1 pl-5">{b.referensi.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div className="md:col-span-2"><p className="mb-1 font-semibold text-teal-800">SOP / alur penggunaan</p><ol className="list-decimal space-y-1 pl-5">{b.sop.map((d) => <li key={d}>{d}</li>)}</ol></div>
              </CardContent>
            </Card>
          ))}
          <Card id="pustaka"><CardHeader><CardTitle>Daftar Pustaka</CardTitle></CardHeader><CardContent><ol className="list-decimal space-y-1 pl-5 text-sm">{pustaka.map((d) => <li key={d}>{d}</li>)}</ol>
            <p className="mt-3 text-xs text-muted-foreground">Nomor dan status peraturan agar diverifikasi berkala di JDIH (peraturan.bpk.go.id / jdih.kemkes.go.id).</p></CardContent></Card>
        </div>
      </div>
    </>
  );
}
