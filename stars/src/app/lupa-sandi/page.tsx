import type { Metadata } from "next";
import { BingkaiAkun } from "@/components/akun/bingkai-akun";
import { FormLupa } from "@/components/akun/form-akun";

export const metadata: Metadata = { title: "Lupa sandi" };

export default function LupaSandiPage() {
  return <BingkaiAkun catatan="Tidak menerima email? Periksa folder spam, atau hubungi Admin STARS untuk menyetel ulang sandi."><FormLupa /></BingkaiAkun>;
}
