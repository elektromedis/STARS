import { redirect } from "next/navigation";

/** User System kini bagian dari CMS Pengguna. */
export default async function UserSystemPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  redirect("/admin/pengguna?bagian=akses" + (role ? "&role=" + encodeURIComponent(role) : ""));
}
