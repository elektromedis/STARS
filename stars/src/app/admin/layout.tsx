import type { Metadata } from "next";
import { LogOut, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminTabs, AdminSubMenu, type TabAdmin, type SubMenuAdmin } from "@/components/admin/admin-tabs";
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
  const op = cukup(u.peran, "Operator"), adm = cukup(u.peran, "Admin");
  // Menu yang dimatikan untuk peran pengguna (Admin → CMS Pengguna → User System) disembunyikan.
  const akses = await aksesPengguna(u.id);
  const boleh = (href: string) => !akses || akses.menu[href.split("?")[0]] !== false;
  const sub = (x: SubMenuAdmin[]) => x.filter((i) => i.tampil !== false && boleh(i.cek ?? i.href));
  const grup: { href: string; label: string; icon: TabAdmin["icon"]; item: SubMenuAdmin[] }[] = [
    { href: "", label: "CMS Impor-Ekspor", icon: "upload", item: sub([
      { href: "/admin/ekspor?bagian=impor", label: "Impor Excel", cek: "/admin/impor", tampil: op },
      { href: "/admin/ekspor?bagian=ekspor", label: "Ekspor & Template", cek: "/admin/ekspor" },
      { href: "/admin/dokumen", label: "Dokumen Paket & Unggah Massal" },
    ]) },
    { href: "", label: "CMS Pemeliharaan", icon: "wrench", item: sub([
      { href: "/admin/lembar-kerja", label: "Lembar Kerja" },
      { href: "/admin/pemeliharaan", label: "Pemeliharaan Korektif / Perbaikan" },
      { href: "/admin/jadwal", label: "Pemeliharaan Preventif" },
      { href: "/admin/tugas", label: "Master Tugas & SKP" },
      { href: "/admin/jadwal-massal", label: "Jadwal Massal" },
      { href: "/admin/rating", label: "Rating & Persetujuan WO" },
      { href: "/admin/logistik", label: "Logistik Mutasi" },
      { href: "/admin/kinerja", label: "Kinerja Pemeliharaan" },
      { href: "/admin/label-inspeksi", label: "Pemantauan Fungsi / Inspeksi" },
      { href: "/admin/alat", label: "Alat Kesehatan", seksi: "Inventarisasi" },
      { href: "/admin/stok", label: "Sparepart & BHP-BMHP", seksi: "Inventarisasi" },
      { href: "/admin/penerimaan", label: "Penerimaan Alat", seksi: "Inventarisasi" },
      { href: "/admin/master", label: "Master Rekanan & Merk", seksi: "Inventarisasi" },
      { href: "/admin/logbook", label: "Log Book Alat", seksi: "Inventarisasi" },
      { href: "/admin/mutasi", label: "Relokasi & Mutasi", seksi: "Inventarisasi" },
      { href: "/admin/kir", label: "KIR Ruangan", seksi: "Inventarisasi" },
      { href: "/admin/bobot", label: "Pembobotan" },
    ]) },
    { href: "", label: "Kalibrasi", icon: "badge", item: sub([{ href: "/admin/kalibrasi", label: "Kalibrasi" }]) },
    { href: "", label: "CMS WHO", icon: "htm", item: sub([
      { href: "/admin/audit", label: "Audit Inventaris" },
      { href: "/admin/htm", label: "HTM WHO 2025" },
      { href: "/admin/analitik", label: "Analitik WHO" },
    ]) },
    { href: "", label: "Monitoring", icon: "thermometer", item: sub([{ href: "/admin/monitoring", label: "Monitoring" }]) },
    { href: "", label: "Pengetahuan AI", icon: "audit", item: sub([{ href: "/admin/pengetahuan", label: "Pengetahuan AI", tampil: adm }]) },
    { href: "", label: "Karyawan AI", icon: "bot", item: sub([{ href: "/admin/karyawan-ai", label: "Karyawan AI", tampil: adm }]) },
    { href: "", label: "Regulasi", icon: "scale", item: sub([{ href: "/admin/regulasi", label: "Regulasi" }]) },
    { href: "", label: "Log Impor", icon: "history", item: sub([{ href: "/admin/log", label: "Log Impor", tampil: op }]) },
    { href: "", label: "CMS Situs", icon: "situs", item: sub([{ href: "/admin/situs", label: "CMS Situs", tampil: adm }]) },
    { href: "", label: "CMS JDIH", icon: "jdih", item: sub([{ href: "/admin/jdih", label: "CMS JDIH", tampil: adm }]) },
    { href: "", label: "CMS Pengguna", icon: "users", item: sub([{ href: "/admin/pengguna", label: "CMS Pengguna", tampil: adm }]) },
    { href: "", label: "Sistem", icon: "settings", item: sub([{ href: "/admin/sistem", label: "Sistem", tampil: adm }]) },
  ];
  const tabsTampil: TabAdmin[] = grup.filter((g) => g.item.length).map((g) => ({ href: g.item[0].href, label: g.label, icon: g.icon, match: g.item.map((i) => i.href.split("?")[0]) }));
  const subGrup = grup.filter((g) => g.item.length > 1).map((g) => ({ label: g.label, item: g.item }));

  return (
    <>
      <div className="print:hidden"><PageHeader
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
      /></div>
      <AdminTabs tabs={tabsTampil} />
      <AdminSubMenu grup={subGrup} />
      {children}
    </>
  );
}
