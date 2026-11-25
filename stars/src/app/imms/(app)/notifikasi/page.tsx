import { sesiImms } from "@/lib/imms-sesi";
import { NotifikasiKlien } from "@/app/notifikasi/notifikasi-klien";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiEmas() {
  await sesiImms();
  return <section className="kaca panel"><NotifikasiKlien /></section>;
}
