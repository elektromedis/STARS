"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifikasi } from "@/components/layout/use-notifikasi";

const WARNA: Record<string, string> = { bahaya: "var(--merah)", peringatan: "var(--kuning)", sukses: "var(--hijau)", info: "var(--aksen)" };
const jam = (iso: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));

/** Lonceng notifikasi EMASCARE: sumber sama dengan STARS (/api/notifikasi), termasuk perubahan data lintas aplikasi & sinkron TRILUX. */
export function Lonceng() {
  const { item, belum, dibaca, tandai } = useNotifikasi();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    document.addEventListener("mousedown", tutup); return () => document.removeEventListener("mousedown", tutup);
  }, [buka]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setBuka((b) => !b)} aria-label={`Notifikasi${belum ? `, ${belum} belum dibaca` : ""}`} aria-expanded={buka} className="relative flex items-center">
        <Bell size={14} />
        {belum > 0 && <span className="emas-titik" aria-hidden>{belum > 9 ? "9+" : belum}</span>}
      </button>
      {buka && (
        <div className="kaca emas-panel-notif" role="dialog" aria-label="Notifikasi">
          <div className="mb-1 flex items-center px-2"><b className="text-[13px]">Notifikasi</b>{belum > 0 && <button type="button" onClick={tandai} className="tautan ml-auto text-[12px]">Tandai dibaca</button>}</div>
          {!item ? <p className="redup p-2 text-[12px]">Memuat…</p> : item.length === 0 ? <p className="redup p-2 text-[12px]">Belum ada notifikasi.</p> : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {item.slice(0, 25).map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setBuka(false)} className="flex gap-2 rounded-lg p-2 text-[12px] hover:bg-[rgba(120,120,128,.1)]">
                    <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: WARNA[n.tingkat] }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={`block ${!dibaca || n.waktu > dibaca ? "font-semibold" : ""}`}>{n.judul}</span>
                      <span className="redup block break-words">{n.isi}</span>
                      <span className="redup2 block text-[11px]">{jam(n.waktu)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
