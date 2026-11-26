"use client";
import Link from "next/link";

/** Galat di halaman EMASCARE (mis. sesi baca-saja mencoba menyimpan, atau isian tidak sah). */
export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="kaca panel space-y-3 text-[13px]" role="alert">
      <h2>Perubahan tidak tersimpan</h2>
      <p className="redup">Isian mungkin belum lengkap, atau Anda sedang memakai <b>Dashboard Dosen Pembimbing / mode pratinjau</b> yang hanya untuk melihat.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="kapsul utama" onClick={reset}>Kembali</button>
        <Link href="/imms" className="kapsul">Ke Beranda</Link>
      </div>
    </section>
  );
}
