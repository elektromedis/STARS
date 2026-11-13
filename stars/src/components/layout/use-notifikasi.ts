"use client";

import { useCallback, useEffect, useState } from "react";
import { laporanSaya, PERISTIWA_DIBACA, PERISTIWA_LOKAL, waktuDibaca, tandaiDibaca } from "@/lib/lokal";
import type { ItemNotif } from "@/lib/notifikasi-jenis";

/** Status laporan milik pelapor (dari /api/lapor/lacak). */
export type StatusLaporanSaya = {
  nomor: string; namaAlat: string; status: string; prioritas: string; unit: string | null; kodeAlat: string | null;
  dibuat: string; diperbarui: string; perintah: { nomor: string; status: string } | null;
};

export async function lacakLaporanSaya(): Promise<StatusLaporanSaya[]> {
  const daftar = laporanSaya().map(({ nomor, kode }) => ({ nomor, kode }));
  if (daftar.length === 0) return [];
  try {
    const r = await fetch("/api/lapor/lacak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daftar }), cache: "no-store" });
    return r.ok ? ((await r.json()) as { laporan: StatusLaporanSaya[] }).laporan : [];
  } catch { return []; }
}

const KET_STATUS: Record<string, string> = {
  Ditinjau: "sedang ditinjau petugas", Diproses: "sedang dikerjakan petugas", Selesai: "sudah selesai ditangani", Ditolak: "ditolak/ditutup petugas",
};

/** Notifikasi gabungan: petugas (bila login) + perubahan status laporan yang dikirim dari perangkat ini. */
export function useNotifikasi() {
  const [item, setItem] = useState<ItemNotif[] | null>(null);
  const [masuk, setMasuk] = useState(false);
  const [dibaca, setDibaca] = useState("");

  const muat = useCallback(async () => {
    const [petugas, saya] = await Promise.all([
      fetch("/api/notifikasi", { cache: "no-store" }).then((r) => r.json() as Promise<{ masuk: boolean; item: ItemNotif[] }>).catch(() => ({ masuk: false, item: [] as ItemNotif[] })),
      lacakLaporanSaya(),
    ]);
    const dariSaya: ItemNotif[] = saya
      .filter((l) => l.status !== "Baru" || l.perintah)
      .map((l) => ({
        id: `saya-${l.nomor}-${l.status}-${l.perintah?.status ?? ""}`, jenis: "laporan-saya",
        judul: `Laporan Anda ${l.nomor}: ${l.status}`,
        isi: `${l.namaAlat} — ${KET_STATUS[l.status] ?? "diterima"}${l.perintah ? ` · perintah kerja ${l.perintah.nomor} (${l.perintah.status})` : ""}.`,
        waktu: l.diperbarui, href: "/riwayat", tingkat: l.status === "Selesai" ? "sukses" : l.status === "Ditolak" ? "bahaya" : "info",
      }));
    setMasuk(petugas.masuk);
    setItem([...dariSaya, ...petugas.item].sort((a, b) => b.waktu.localeCompare(a.waktu)));
  }, []);

  useEffect(() => {
    setDibaca(waktuDibaca());
    muat();
    const t = window.setInterval(muat, 120_000);
    const dibacaBaru = () => setDibaca(waktuDibaca());
    const tampak = () => { if (document.visibilityState === "visible") muat(); };
    window.addEventListener(PERISTIWA_LOKAL, muat); // laporan baru dikirim dari perangkat ini
    window.addEventListener(PERISTIWA_DIBACA, dibacaBaru); // hanya memperbarui lencana, tanpa memuat ulang
    document.addEventListener("visibilitychange", tampak);
    return () => {
      window.clearInterval(t); window.removeEventListener(PERISTIWA_LOKAL, muat); window.removeEventListener(PERISTIWA_DIBACA, dibacaBaru);
      document.removeEventListener("visibilitychange", tampak);
    };
  }, [muat]);

  const belum = (item ?? []).filter((i) => !dibaca || i.waktu > dibaca).length;
  const tandai = useCallback(() => { tandaiDibaca(); setDibaca(waktuDibaca()); }, []);
  return { item, masuk, belum, dibaca, tandai, muat };
}
