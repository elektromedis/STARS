import type { Metadata } from "next";
import { DatabaseBackup, Globe, Server, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getDatasets } from "@/lib/queries";
import { HapusDataPaket } from "@/components/admin/hapus-data-paket";
import pkg from "../../../../package.json";

export const metadata: Metadata = { title: "Sistem" };
export const dynamic = "force-dynamic";

const tgl = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d) : "-");

export default async function SistemPage() {
  await sesiHalaman("Admin");
  const mode = process.env.STARS_MODE === "internet" ? "internet" : "intranet";
  const [paket, pengguna, logImpor, sinkron, auditLog, grupPaket] = await Promise.all([
    prisma.paket.count(),
    prisma.pengguna.count({ where: { aktif: true } }),
    prisma.logImpor.count(),
    prisma.logImpor.findFirst({ where: { pengguna: "sinkron" }, orderBy: { waktu: "desc" } }),
    prisma.auditLog.findMany({ orderBy: { waktu: "desc" }, take: 50 }),
    getDatasets(),
  ]);
  const db = (process.env.DATABASE_URL ?? "").startsWith("file:") ? "SQLite" : "PostgreSQL";

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">{mode === "internet" ? <Globe className="size-5 text-teal-700" /> : <Server className="size-5 text-teal-700" />} Mode server</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p><Badge variant="teal">{mode}</Badge> • STARS v{pkg.version} • {db}</p>
            <p>{mode === "internet" ? "Baca saja: data datang dari sinkronisasi server intranet." : "Sumber kebenaran: operator mengunggah data di sini."}</p>
            <p>Sinkron terakhir {mode === "internet" ? "diterima" : "dikirim"}: {tgl(sinkron?.waktu)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ringkasan data</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{formatNumber(paket)} paket • {formatNumber(pengguna)} pengguna aktif • {formatNumber(logImpor)} impor tercatat</p>
            <p>Audit log: {formatNumber(auditLog.length)} kejadian terakhir ditampilkan di bawah.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DatabaseBackup className="size-5 text-teal-700" /> Cadangan</CardTitle><CardDescription>Salinan konsisten seluruh basis data (.db). Simpan di drive RS/cloud minimal mingguan.</CardDescription></CardHeader>
          <CardContent><Button asChild><a href="/api/admin/cadangan"><DatabaseBackup /> Unduh cadangan sekarang</a></Button></CardContent>
        </Card>
      </div>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800"><Trash2 className="size-5" /> Hapus data paket per tahun / tahap</CardTitle>
          <CardDescription>Untuk membersihkan data lama. Salinan basis data dibuat otomatis di server sebelum menghapus; untuk pengamanan ekstra, unduh cadangan di atas terlebih dahulu. Tindakan tercatat di audit log.</CardDescription>
        </CardHeader>
        <CardContent><HapusDataPaket data={grupPaket.map((g) => ({ tahun: g.tahun, tahap: g.tahap, baris: g.baris, nilai: g.nilai }))} boleh={mode !== "internet"} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sinkronisasi intranet → internet</CardTitle><CardDescription>Dijalankan dari server intranet, mengirim seluruh paket ke server internet dengan token bersama.</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <pre className="overflow-x-auto rounded-md bg-navy-950 p-3 text-xs text-navy-100">{`# di server intranet, isi .env:\nSYNC_URL=https://stars.domain-rs.go.id\nSYNC_TOKEN=<token yang sama dengan server internet>\n\nnpm run sync          # kirim sekarang\n# jadwalkan harian: Task Scheduler (Windows) / cron (Linux) → lihat docs §3.3`}</pre>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Audit log</CardTitle><CardDescription>Login, impor, kelola pengguna, cadangan, sinkron. 50 terakhir.</CardDescription></CardHeader>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Waktu</TableHead><TableHead>Aksi</TableHead><TableHead>Pengguna</TableHead><TableHead className="hidden md:table-cell">Objek</TableHead><TableHead className="hidden lg:table-cell">Detail</TableHead><TableHead className="hidden md:table-cell">IP</TableHead></TableRow></TableHeader>
          <TableBody>
            {auditLog.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada kejadian.</TableCell></TableRow>}
            {auditLog.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap text-xs">{tgl(a.waktu)}</TableCell>
                <TableCell><Badge variant={/gagal|ditolak|terkunci|dikunci|dibatasi/.test(a.aksi) ? "danger" : /berhasil|simpan|terima/.test(a.aksi) ? "success" : "outline"}>{a.aksi}</Badge></TableCell>
                <TableCell className="text-xs">{a.email ?? "-"}</TableCell>
                <TableCell className="hidden max-w-xs truncate text-xs md:table-cell" title={a.objek ?? ""}>{a.objek ?? "-"}</TableCell>
                <TableCell className="hidden max-w-sm truncate text-xs text-muted-foreground lg:table-cell" title={a.detail ?? ""}>{a.detail ?? "-"}</TableCell>
                <TableCell className="hidden text-xs md:table-cell">{a.ip ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
