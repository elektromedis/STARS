"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, FileDown, History, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalWa, tampilWa, tautanWa } from "@/lib/wa";

export type RingkasanLapor = {
  nomor: string; kode: string; namaAlat: string; kodeAlat: string | null; unit: string | null; lokasi: string | null;
  pelapor: string; kontak: string | null; prioritas: string; keluhan: string; waktu: string;
};

/** Layar setelah laporan terkirim: PDF terunduh otomatis + tombol kirim ringkasan & tautan PDF ke WhatsApp admin dan pelapor. */
export function SuksesLapor({ r, waAdmin }: { r: RingkasanLapor; waAdmin: string | null }) {
  const asal = typeof window === "undefined" ? "" : window.location.origin;
  const urlPdf = `${asal}/api/lapor/${encodeURIComponent(r.nomor)}/pdf?kode=${encodeURIComponent(r.kode)}`;
  const waPelapor = normalWa(r.kontak);
  const sudah = useRef(false);

  // Unduh PDF otomatis sekali saat layar ini muncul.
  useEffect(() => {
    if (sudah.current) return;
    sudah.current = true;
    (async () => {
      try {
        const res = await fetch(urlPdf, { cache: "no-store" });
        if (!res.ok) return;
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url; a.download = `Laporan-${r.nomor}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch { /* gagal unduh otomatis: tombol Unduh PDF tetap tersedia */ }
    })();
  }, [urlPdf, r.nomor]);

  const jam = new Date(r.waktu).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
  const isi = [
    `*LAPORAN KERUSAKAN ALAT — ${r.nomor}*`,
    `Tanggal : ${jam} WIB`,
    `Prioritas : ${r.prioritas}`,
    "",
    `Alat : ${r.namaAlat}${r.kodeAlat ? ` (${r.kodeAlat})` : ""}`,
    `Unit : ${r.unit ?? "-"}`,
    `Lokasi : ${r.lokasi ?? "-"}`,
    "",
    `Pelapor : ${r.pelapor}`,
    `Kontak : ${r.kontak ?? "-"}`,
    "",
    "Keluhan :",
    r.keluhan,
    "",
    `PDF laporan: ${urlPdf}`,
  ];
  const teksAdmin = isi.join("\n");
  const teksPelapor = [`Salinan laporan kerusakan Anda (${r.nomor}) di STARS RSUD Cipayung.`, "", ...isi.slice(1), "", `Pantau status: ${asal}/riwayat`].join("\n");

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
      <h2 className="mt-3 text-lg font-bold text-navy-800">Laporan terkirim. Terima kasih!</h2>
      <p className="mt-1 text-sm text-muted-foreground">Nomor laporan Anda — simpan untuk menanyakan status ke petugas:</p>
      <p className="mt-2 inline-block rounded-lg border border-emerald-300 bg-white px-4 py-2 font-mono text-lg font-bold text-emerald-700">{r.nomor}</p>
      <p className="mt-3 text-sm text-muted-foreground">PDF laporan sedang diunduh otomatis. Bila tidak muncul, tekan <strong>Unduh PDF</strong>.</p>

      <div className="mx-auto mt-5 grid max-w-md gap-2">
        {waAdmin && (
          <Button asChild className="h-12 bg-[#1fa855] text-base text-white hover:bg-[#178a45]">
            <a href={tautanWa(waAdmin, teksAdmin)} target="_blank" rel="noopener noreferrer"><Send /> Kirim ke WA admin elektromedis</a>
          </Button>
        )}
        <Button asChild variant="outline" className="h-11 border-[#1fa855] text-[#14753b] hover:bg-[#1fa855]/10">
          <a href={tautanWa(waPelapor, teksPelapor)} target="_blank" rel="noopener noreferrer"><MessageCircle /> {waPelapor ? `Kirim salinan ke WA saya (${tampilWa(waPelapor)})` : "Kirim salinan ke WhatsApp…"}</a>
        </Button>
        <Button asChild variant="outline" className="h-11"><a href={`${urlPdf}&unduh=1`} download={`Laporan-${r.nomor}.pdf`}><FileDown /> Unduh PDF</a></Button>
      </div>
      {!waAdmin && <p className="mt-2 text-xs text-muted-foreground">Nomor WA admin belum diatur (ADMIN › Sistem). Laporan tetap sudah tercatat di STARS.</p>}
      <p className="mt-2 text-xs text-muted-foreground">WhatsApp terbuka dengan pesan sudah terisi — tinggal tekan <strong>Kirim</strong>. Tautan PDF hanya dapat dibuka oleh pemegang pesan ini.</p>

      <p className="mt-5 text-sm text-muted-foreground">Status laporan bisa dipantau di menu <strong>Riwayat</strong> dan <strong>Notifikasi</strong> pada perangkat ini. Untuk kerusakan darurat, tetap hubungi petugas secara langsung.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="teal" asChild><Link href="/riwayat"><History /> Lacak di Riwayat</Link></Button>
        <Button variant="outline" asChild><a href="/lapor">Lapor lagi</a></Button>
        <Button variant="outline" asChild><Link href="/">Kembali ke beranda</Link></Button>
      </div>
    </div>
  );
}
