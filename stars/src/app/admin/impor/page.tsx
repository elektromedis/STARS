import { redirect } from "next/navigation";

/** Impor Excel kini bagian dari CMS Impor-Ekspor. */
export default function ImporPage() {
  redirect("/admin/ekspor?bagian=impor");
}
