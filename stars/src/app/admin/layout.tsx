import type { Metadata } from "next";
import { LogOut, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { aksesPengguna } from "@/lib/role";
import { keluar } from "@/app/login/actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin STARS" } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await sesiHalaman("Viewer");
  const u = s.user;
  const tabs = [
    { href: "/admin/impor", label: "Impor Excel", icon: "upload" as const, tampil: cukup(u.peran, "Operator") },
    { href: "/admin/ekspor", label: "Ekspor & Template", icon: "download" as const, tampil: true },
    { href: "/admin/dokumen", label: "Dokumen Paket", icon: "file" as const, tampil: true },
    { href: "/admin/pemeliharaan", label: "Pemeliharaan", icon: "wrench" as const, tampil: true },
    { href: "/admin/lembar-kerja", label: "Lembar Kerja", icon: "audit" as const, tampil: true },
    { href: "/admin/pengetahuan", label: "Pengetahuan AI", icon: "audit" as const, tampil: cukup(u.peran, "Admin") },
    { href: "/admin/alat", label: "Daftar Alat", icon: "box" as const, tampil: true },
    { href: "/admin/jadwal", label: "Jadwal Preventif", icon: "calendar" as const, tampil: true },
    { href: "/admin/kalibrasi", label: "Kalibrasi", icon: "badge" as const, tampil: true },
    { href: "/admin/stok", label: "Stok & BHP", icon: "package" as const, tampil: true },
    { href: "/admin/audit", label: "Audit Inventaris", icon: "audit" as const, tampil: true },
    { href: "/admin/htm", label: "HTM WHO 2025", icon: "htm" as const, tampil: true },
    { href: "/admin/bobot", label: "Pembobotan", icon: "bobot" as const, tampil: true },
    { href: "/admin/regulasi", label: "Regulasi", icon: "scale" as const, tampil: true },
    { href: "/admin/kir", label: "KIR Ruangan", icon: "kir" as const, tampil: true },
    { href: "/admin/label-inspeksi", label: "Label Inspeksi", icon: "tag" as const, tampil: true },
    { href: "/admin/analitik", label: "Analitik WHO", icon: "chart" as const, tampil: true },
    { href: "/admin/monitoring", label: "Monitoring", icon: "thermometer" as const, tampil: true },
    { href: "/admin/log", label: "Log Impor", icon: "history" as const, tampil: cukup(u.peran, "Operator") },
    { href: "/admin/situs", label: "CMS Situs", icon: "situs" as const, tampil: cukup(u.peran, "Admin") },
    { href: "/admin/jdih", label: "CMS JDIH", icon: "jdih" as const, tampil: cukup(u.peran, "Admin") },
    { href: "/admin/pengguna", label: "Pengguna", icon: "users" as const, tampil: cukup(u.peran, "Admin") },
    { href: "/admin/user-system", label: "User System", icon: "users" as const, tampil: cukup(u.peran, "Admin") },
    { href: "/admin/sistem", label: "Sistem", icon: "settings" as const, tampil: cukup(u.peran, "Admin") },
  ].filter((t) => t.tampil);
  // Menu yang dimatikan untuk peran pengguna (Admin → User System) disembunyikan.
  const akses = await aksesPengguna(u.id);
  const tabsTampil = akses ? tabs.filter((t) => akses.menu[t.href] !== false) : tabs;

  return (
    <>
      <PageHeader
        title="Administrasi Data"
        description="Kelola data paket lewat unggah dan unduh Excel, tanpa input satu per satu."
        actions={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2 text-sm shadow-card sm:w-auto">
            <UserCircle2 className="size-5 text-teal-700" aria-hidden />
            <div className="min-w-0 flex-1 leading-tight sm:flex-none">
              <div className="truncate font-medium text-navy-800">{u.nama}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
            <Badge variant="teal">{u.peran}</Badge>
            {akses && <Badge variant="outline">{akses.role}</Badge>}
            {u.unitKerja && <Badge variant="outline">{u.unitKerja}</Badge>}
            <form action={keluar}><Button type="submit" variant="ghost" size="sm" title="Keluar"><LogOut /> Keluar</Button></form>
          </div>
        }
      />
      <AdminTabs tabs={tabsTampil} />
      {children}
    </>
  );
}
