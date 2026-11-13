import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotifikasiKlien } from "./notifikasi-klien";

export const metadata: Metadata = { title: "Notifikasi" };
export const dynamic = "force-dynamic";

export default function NotifikasiPage() {
  return (
    <>
      <PageHeader title="Notifikasi" description="Perubahan status laporan kerusakan Anda, dan bagi petugas: laporan baru, perintah kerja, preventif jatuh tempo, serta kalibrasi yang perlu perhatian." />
      <NotifikasiKlien />
    </>
  );
}
