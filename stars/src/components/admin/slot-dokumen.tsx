"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TERIMA_DOKUMEN } from "@/lib/dokumen";

type Dok = { id: number; namaBerkas: string; ukuran: number; nomor: string | null; tanggal: string | null; keterangan: string | null; diunggahOleh: string | null; createdAt: string };

const ukuran = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const tgl = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/** Satu jenis dokumen pada satu paket: daftar berkas + unggah + hapus. */
export function SlotDokumen({ paketKode, jenis, label, dokumen, bolehKelola }: { paketKode: string; jenis: string; label: string; dokumen: Dok[]; bolehKelola: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sibuk, setSibuk] = useState<"" | "unggah" | number>("");
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);

  async function unggah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("paketKode", paketKode); fd.set("jenis", jenis);
    setSibuk("unggah"); setPesan(null);
    try {
      const res = await fetch("/api/admin/dokumen", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: string; error?: string };
      setPesan(data);
      if (res.ok) { formRef.current?.reset(); router.refresh(); }
    } catch (err) { setPesan({ error: err instanceof Error ? err.message : String(err) }); }
    finally { setSibuk(""); }
  }

  async function hapus(d: Dok) {
    if (!window.confirm(`Hapus ${label} "${d.namaBerkas}"? Berkas akan dihapus permanen.`)) return;
    setSibuk(d.id); setPesan(null);
    try {
      const res = await fetch(`/api/admin/dokumen/${d.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: string; error?: string };
      setPesan(data);
      if (res.ok) router.refresh();
    } catch (err) { setPesan({ error: err instanceof Error ? err.message : String(err) }); }
    finally { setSibuk(""); }
  }

  return (
    <Card className={dokumen.length ? "border-teal-200" : undefined}>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2"><FileText className="size-4 text-teal-700" /> {label}</CardTitle>
        <Badge variant={dokumen.length ? "success" : "outline"}>{dokumen.length ? `${dokumen.length} berkas` : "Belum ada"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        {dokumen.length > 0 && (
          <ul className="divide-y rounded-lg border text-sm">
            {dokumen.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <a href={`/api/dokumen/${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium text-navy-800 hover:text-teal-700 hover:underline">
                    <span className="truncate">{d.namaBerkas}</span><ExternalLink className="size-3.5 shrink-0" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {[d.nomor && `No. ${d.nomor}`, d.tanggal && tgl(d.tanggal), ukuran(d.ukuran)].filter(Boolean).join(" • ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Diunggah {tgl(d.createdAt)}{d.diunggahOleh ? ` oleh ${d.diunggahOleh}` : ""}{d.keterangan ? ` — ${d.keterangan}` : ""}</p>
                </div>
                {bolehKelola && (
                  <Button type="button" variant="ghost" size="sm" title="Hapus" onClick={() => hapus(d)} disabled={sibuk !== ""}>
                    {sibuk === d.id ? <Loader2 className="animate-spin" /> : <Trash2 className="text-red-600" />}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {bolehKelola && (
          <form ref={formRef} onSubmit={unggah} className="grid gap-2 rounded-lg border border-dashed p-3">
            <Input name="file" type="file" accept={TERIMA_DOKUMEN} required className="h-auto py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-2 file:py-1 file:text-teal-700" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="nomor" placeholder="Nomor dokumen" maxLength={120} className="h-9 text-xs" />
              <Input name="tanggal" type="date" className="h-9 text-xs" aria-label="Tanggal dokumen" />
            </div>
            <Input name="keterangan" placeholder="Keterangan (opsional)" maxLength={500} className="h-9 text-xs" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">PDF/JPG/PNG/DOCX/XLSX, maks 15 MB</span>
              <Button type="submit" size="sm" variant="teal" disabled={sibuk !== ""}>{sibuk === "unggah" ? <Loader2 className="animate-spin" /> : <Upload />} Unggah</Button>
            </div>
          </form>
        )}
        {pesan?.error && <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5 shrink-0" /> {pesan.error}</p>}
        {pesan?.ok && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5 shrink-0" /> {pesan.ok}</p>}
      </CardContent>
    </Card>
  );
}
