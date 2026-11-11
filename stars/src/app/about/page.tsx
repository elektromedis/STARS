import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { LogoFull } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "About STARS" };

const STACK = ["Next.js 15", "TypeScript", "Tailwind CSS", "shadcn/ui", "Recharts", "Prisma", "SQLite (dev) / PostgreSQL (prod)", "SheetJS"];
const ROLES = ["Public", "Viewer", "Operator", "Admin", "Super Admin"];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About STARS" description="Sistem Terintegrasi Alat Kesehatan Rumah Sakit — Monitor • Analyze • Connect." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Tentang Sistem</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <LogoFull width={280} className="-ml-2" />
            <p>STARS adalah sistem terintegrasi untuk memantau perencanaan, pengadaan, dan pemeliharaan alat kesehatan di RSUD Cipayung, mulai dari ringkasan nilai, daftar paket, hingga dataset yang dapat diunduh.</p>
            <p>Sumber data adalah kertas kerja RKPBU (Rencana Kebutuhan Pemeliharaan Barang Unit) dan RKBU alat kesehatan BLUD RSUD Cipayung per tahun dan tahap anggaran (Ranwal, Penetapan, Pergeseran, Perubahan). Nilai yang ditampilkan sudah termasuk PPN sesuai kertas kerja.</p>
            <p>Struktur informasi (Overview, Nilai, Paket, Data) terinspirasi dari dashboard INAPROC. STARS dikembangkan secara independen dan bukan aplikasi resmi INAPROC maupun LKPP.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Peran Pengguna</CardTitle><CardDescription>Diterapkan pada tahap autentikasi</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{ROLES.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}</CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Catatan Data</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>• Lokasi yang menyebut beberapa unit (misalnya &quot;ICU, IGD, OK&quot;) dicatat pada unit pertama yang dikenal; teks aslinya tetap tersimpan dan dapat dicari di halaman Paket.</p>
            <p>• Lokasi yang bukan unit kerja (misalnya &quot;Seluruh Unit&quot;) dikelompokkan ke unit <strong>TIDAK ADA</strong>.</p>
            <p>• Kategori ditentukan otomatis dari nama rekening dan uraian pemeliharaan (Pengujian &amp; Kalibrasi, Suku Cadang &amp; Aksesori, Kontrak Servis, dan seterusnya).</p>
            <p>• Baris bernilai Rp 0 pada kertas kerja tidak dimuat karena bukan item anggaran.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Teknologi</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{STACK.map((s) => <Badge key={s} variant="teal">{s}</Badge>)}</CardContent>
        </Card>
      </div>
    </>
  );
}
