import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, ClipboardList, Clock, Gauge, LogIn, LogOut, Mail, Settings, ShieldCheck, Wrench } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { keluar } from "@/app/login/actions";
import { cukup, PERAN_KETERANGAN, adalahPeran } from "@/lib/peran";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { UbahSandi } from "./ubah-sandi";
import { PengaturanPerangkat } from "./pengaturan-perangkat";

export const metadata: Metadata = { title: "Akun Saya" };
export const dynamic = "force-dynamic";

const inisial = (nama: string) => nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]?.toUpperCase()).join("") || "?";

export default async function AkunPage() {
  const s = await auth();
  if (!s?.user?.email) {
    return (
      <>
        <PageHeader title="Akun Saya" />
        <div className="mx-auto grid max-w-3xl gap-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-navy-800 to-teal-800 px-6 py-8 text-center text-white">
              <span className="flex size-16 items-center justify-center rounded-full bg-white/15"><LogIn className="size-8" aria-hidden /></span>
              <h2 className="text-lg font-bold">Anda belum masuk</h2>
              <p className="max-w-md text-sm text-navy-100">Melapor kerusakan, scan QR, dan melihat inventaris tidak memerlukan akun. Petugas masuk untuk mengelola laporan, alat, dokumen, dan kalibrasi.</p>
              <Button variant="teal" size="lg" asChild><Link href="/login?callbackUrl=%2Fakun"><LogIn /> Masuk</Link></Button>
            </div>
            <CardContent className="grid gap-2 p-5 text-sm text-muted-foreground">
              <p>Akun dibuat oleh Admin STARS (Elektromedik). Lupa sandi? Hubungi Admin untuk disetel ulang.</p>
            </CardContent>
          </Card>
          <PengaturanPerangkat />
        </div>
      </>
    );
  }

  const u = await prisma.pengguna.findUnique({ where: { email: s.user.email }, select: { nama: true, email: true, peran: true, terakhirLogin: true, createdAt: true, unitKerja: { select: { nama: true } } } });
  const peran = u?.peran ?? s.user.peran;
  const operator = cukup(peran, "Operator");
  const pintasan = [
    { href: "/admin", label: "Admin", ikon: Settings, tampil: true },
    { href: "/admin/pemeliharaan", label: "Laporan & perintah kerja", ikon: Wrench, tampil: true },
    { href: "/admin/kalibrasi", label: "CMS Kalibrasi", ikon: Gauge, tampil: true },
    { href: "/admin/alat", label: "Daftar alat", ikon: ClipboardList, tampil: operator },
  ].filter((p) => p.tampil);

  return (
    <>
      <PageHeader title="Akun Saya" />
      <div className="mx-auto grid max-w-3xl gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 bg-gradient-to-br from-navy-800 to-teal-800 p-5 text-white sm:p-6">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-bold ring-2 ring-white/30" aria-hidden>{inisial(u?.nama ?? s.user.nama ?? "")}</span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{u?.nama ?? s.user.nama}</h2>
              <p className="flex items-center gap-1.5 truncate text-sm text-navy-100"><Mail className="size-3.5 shrink-0" /> {u?.email ?? s.user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="teal" className="gap-1"><BadgeCheck className="size-3" /> {peran}</Badge>
                {u?.unitKerja && <Badge variant="outline" className="gap-1 border-white/30 text-white"><Building2 className="size-3" /> {u.unitKerja.nama}</Badge>}
              </div>
            </div>
          </div>
          <CardContent className="grid gap-3 p-5 text-sm">
            {adalahPeran(peran) && <p className="flex items-start gap-2 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" /> {PERAN_KETERANGAN[peran]}.</p>}
            {u?.terakhirLogin && <p className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 shrink-0 text-teal-700" /> Masuk terakhir {u.terakhirLogin.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>}
            <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
              {pintasan.map(({ href, label, ikon: Ikon }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium text-navy-800 transition hover:border-teal-300 hover:bg-teal-50">
                  <Ikon className="size-5 text-teal-700" aria-hidden /> {label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ganti sandi</CardTitle><CardDescription>Minimal 8 karakter. Gunakan sandi yang tidak dipakai di aplikasi lain.</CardDescription></CardHeader>
          <CardContent><UbahSandi /></CardContent>
        </Card>

        <PengaturanPerangkat />

        <form action={keluar} className="flex justify-center">
          <Button type="submit" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50"><LogOut /> Keluar</Button>
        </form>
      </div>
    </>
  );
}
