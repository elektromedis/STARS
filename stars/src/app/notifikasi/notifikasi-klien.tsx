"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, BellOff, BellRing, CalendarClock, CheckCheck, ClipboardList, Gauge, LogIn, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifikasi } from "@/components/layout/use-notifikasi";
import type { ItemNotif } from "@/lib/notifikasi-jenis";
import { waktuDibaca } from "@/lib/lokal";
import { cn } from "@/lib/utils";

const IKON: Record<ItemNotif["jenis"], typeof BellRing> = { laporan: Wrench, wo: ClipboardList, preventif: CalendarClock, kalibrasi: Gauge, "laporan-saya": BadgeCheck };
const WARNA: Record<ItemNotif["tingkat"], string> = {
  info: "bg-teal-50 text-teal-700", sukses: "bg-emerald-50 text-emerald-700", peringatan: "bg-amber-50 text-amber-700", bahaya: "bg-red-50 text-red-700",
};

function relatif(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "baru saja";
  if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  if (d < 7 * 86400) return `${Math.floor(d / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function NotifikasiKlien() {
  const { item, masuk, tandai } = useNotifikasi();
  // Sorot item yang belum dibaca saat halaman dibuka, lalu tandai semua sudah dibaca.
  const dibacaAwal = useRef<string | null>(null);
  if (dibacaAwal.current === null && typeof window !== "undefined") dibacaAwal.current = waktuDibaca();
  const sudah = useRef(false);
  useEffect(() => { if (item && !sudah.current) { sudah.current = true; tandai(); } }, [item, tandai]);

  if (!item) return <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat notifikasi…</p>;
  const batas = dibacaAwal.current ?? "";

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {!masuk && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          <BellRing className="size-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">Petugas Elektromedik/IPSRS: masuk untuk menerima notifikasi laporan baru, perintah kerja, preventif, dan kalibrasi.</p>
          <Button size="sm" variant="teal" asChild><Link href="/login?callbackUrl=%2Fnotifikasi"><LogIn /> Masuk</Link></Button>
        </div>
      )}
      {item.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><BellOff className="size-7" aria-hidden /></span>
          <h2 className="font-semibold text-navy-800">Belum ada notifikasi</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Saat laporan kerusakan yang Anda kirim dari perangkat ini ditinjau, diproses, atau selesai, kabarnya muncul di sini.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.length} notifikasi</span>
            <span className="inline-flex items-center gap-1"><CheckCheck className="size-3.5" /> Semua ditandai sudah dibaca</span>
          </div>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {item.map((n) => {
              const Ikon = IKON[n.jenis];
              const baru = !batas || n.waktu > batas;
              return (
                <li key={n.id}>
                  <Link href={n.href} className={cn("flex gap-3 p-4 transition hover:bg-muted/40", baru && "bg-teal-50/50")}>
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", WARNA[n.tingkat])}><Ikon className="size-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold leading-snug text-navy-800">{n.judul}</span>
                        {baru && <span className="mt-1 size-2 shrink-0 rounded-full bg-red-600" aria-label="baru" />}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{n.isi}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{relatif(n.waktu)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
