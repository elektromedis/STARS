import Link from "next/link";
import { LogoEmas } from "@/components/imms/logo";
import { QrScan } from "@/components/layout/qr-scan";

/** Halaman EMASCARE tanpa akun (lapor kerusakan & lacak laporan). Tidak menampilkan data inventaris. */
export default function LayoutPublik({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="imms-menubar">
        <Link href="/imms/login" className="flex items-center gap-2" aria-label="EMASCARE — halaman masuk"><LogoEmas ukuran={20} />
          <span className="emas-teks font-bold tracking-[.08em]">EMASCARE</span></Link>
        <span className="ml-auto flex items-center gap-3 text-[12px]">
          <Link href="/imms/lapor" className="tautan">Lapor</Link>
          <Link href="/imms/riwayat" className="tautan">Lacak laporan</Link>
          <Link href="/imms/login" className="tautan">Masuk petugas</Link>
        </span>
      </div>
      <div className="emas-publik">{children}</div>
      <QrScan />
    </>
  );
}
