import Link from "next/link";
import { Search } from "lucide-react";

export function Kartu({ judul, nilai, ket, nada, href }: { judul: string; nilai: React.ReactNode; ket?: React.ReactNode; nada?: "merah" | "kuning" | "hijau" | "biru"; href?: string }) {
  const isi = (
    <div className="kaca panel h-full">
      <div className="redup text-[12px] font-semibold">{judul}</div>
      <div className="angka mt-1" style={nada ? { color: `var(--${nada === "biru" ? "aksen" : nada})` } : undefined}>{nilai}</div>
      {ket && <div className="redup2 mt-0.5 text-[12px]">{ket}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{isi}</Link> : isi;
}

const NADA: Record<string, string> = {
  Terbuka: "biru", Dikerjakan: "kuning", Selesai: "hijau", Batal: "", Baru: "biru", Ditinjau: "biru", Diproses: "kuning", Ditolak: "merah",
  Diajukan: "kuning", Disetujui: "hijau", Laik: "hijau", "Tidak laik": "merah", Darurat: "merah", Tinggi: "kuning", Normal: "biru", Rendah: "",
  Baik: "hijau", "Rusak Ringan": "kuning", "Rusak Berat": "merah", Afkir: "merah", Korektif: "merah", Preventif: "hijau", Inspeksi: "ungu",
};
export const Lencana = ({ t, nada }: { t: string | null | undefined; nada?: string }) => (t ? <span className={`lencana ${nada ?? NADA[t] ?? ""}`}>{t}</span> : <span className="redup2">—</span>);

export function Cari({ q, placeholder, children }: { q?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="redup2 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
        <input name="q" defaultValue={q} placeholder={placeholder} className="isian cari" aria-label={placeholder} />
      </div>
      {children}
      <button className="kapsul">Terapkan</button>
    </form>
  );
}

export function Kosong({ children }: { children: React.ReactNode }) {
  return <div className="redup py-10 text-center text-[13px]">{children}</div>;
}

export function Tabel({ children }: { children: React.ReactNode }) {
  return <div className="kaca overflow-x-auto rounded-[20px] p-1.5"><table className="tabel">{children}</table></div>;
}

export function Hal({ hal, total, per, dasar }: { hal: number; total: number; per: number; dasar: string }) {
  const maks = Math.max(1, Math.ceil(total / per));
  if (maks <= 1) return null;
  const u = (n: number) => `${dasar}${dasar.includes("?") ? "&" : "?"}hal=${n}`;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-[13px]">
      <span className="redup">Hal. {hal} dari {maks} · {total} data</span>
      {hal > 1 && <Link className="kapsul" href={u(hal - 1)}>‹ Sebelumnya</Link>}
      {hal < maks && <Link className="kapsul" href={u(hal + 1)}>Berikutnya ›</Link>}
    </div>
  );
}
