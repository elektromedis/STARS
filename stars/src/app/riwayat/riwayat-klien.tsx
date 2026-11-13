"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, FileSearch, History, Loader2, ScanQrCode, Send, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { lacakLaporanSaya, type StatusLaporanSaya } from "@/components/layout/use-notifikasi";
import { badgeStatusPermintaan } from "@/lib/pemeliharaan";
import { urlDetailAlat } from "@/lib/dokumen-alat";
import { bukaScan, hapusLokal, laporanSaya, PERISTIWA_LOKAL, riwayatScan, type LaporanSaya, type ScanSaya } from "@/lib/lokal";
import { cn } from "@/lib/utils";

export type Aktivitas = { id: number; waktu: string; aksi: string; objek: string | null; detail: string | null };

const waktu = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const LABEL_AKSI: Record<string, string> = {
  "login.berhasil": "Masuk", "login.gagal": "Percobaan masuk gagal", "akun.dikunci": "Akun dikunci sementara", "permintaan.buat": "Laporan kerusakan dibuat",
  "kalibrasi.simpan": "Catatan kalibrasi disimpan", "kalibrasi.ubah": "Catatan kalibrasi diubah", "kalibrasi.hapus": "Catatan kalibrasi dihapus",
  "alat.foto": "Foto alat", "alat.dokumen": "Dokumen alat diunggah", "alat.dokumen.hapus": "Dokumen alat dihapus", "alat.label": "Label QR dicetak",
  "pengguna.sandi-sendiri": "Sandi akun diganti", "impor.simpan": "Impor Excel paket", "impor.gagal": "Impor Excel gagal", "cadangan.unduh": "Cadangan basis data diunduh",
  "login.dibatasi": "Percobaan masuk dibatasi", "login.terkunci": "Masuk ditolak (akun terkunci)", "alat.buat": "Alat ditambahkan", "alat.ubah": "Data alat diubah",
  "alat.impor": "Impor inventaris alat", "alat.impor.gagal": "Impor inventaris gagal", "dokumen.unggah": "Dokumen paket diunggah", "dokumen.hapus": "Dokumen paket dihapus",
  "jadwal.buat": "Jadwal preventif dibuat", "jadwal.ubah": "Jadwal preventif diubah", "paket.hapus": "Data paket dihapus", "pengguna.buat": "Pengguna dibuat",
  "pengguna.sandi": "Sandi pengguna disetel ulang", "pengguna.ubah": "Pengguna diubah", "perintah.buat": "Perintah kerja dibuat", "perintah.ubah": "Perintah kerja diubah",
  "permintaan.status": "Status laporan diubah", "ruangan.buat": "Ruangan ditambahkan",
};

type Tab = "laporan" | "scan" | "akun";

export function RiwayatKlien({ aktivitas, masuk }: { aktivitas: Aktivitas[]; masuk: boolean }) {
  const [tab, setTab] = useState<Tab>("laporan");
  const [lokal, setLokal] = useState<{ laporan: LaporanSaya[]; scan: ScanSaya[] } | null>(null);
  const [status, setStatus] = useState<Map<string, StatusLaporanSaya> | null>(null);

  useEffect(() => {
    const baca = () => setLokal({ laporan: laporanSaya(), scan: riwayatScan() });
    baca();
    lacakLaporanSaya().then((d) => setStatus(new Map(d.map((l) => [l.nomor, l]))));
    window.addEventListener(PERISTIWA_LOKAL, baca);
    return () => window.removeEventListener(PERISTIWA_LOKAL, baca);
  }, []);

  const tabs: { kode: Tab; label: string; jumlah?: number }[] = [
    { kode: "laporan", label: "Laporan Saya", jumlah: lokal?.laporan.length },
    { kode: "scan", label: "Alat Dipindai", jumlah: lokal?.scan.length },
    ...(masuk ? [{ kode: "akun" as Tab, label: "Aktivitas Akun", jumlah: aktivitas.length }] : []),
  ];

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div role="tablist" aria-label="Jenis riwayat" className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-card">
        {tabs.map((t) => (
          <button key={t.kode} role="tab" type="button" aria-selected={tab === t.kode} onClick={() => setTab(t.kode)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition", tab === t.kode ? "bg-navy-800 text-white shadow" : "text-muted-foreground hover:bg-muted/60 hover:text-navy-800")}>
            {t.label}{typeof t.jumlah === "number" && <span className={cn("rounded-full px-1.5 text-xs", tab === t.kode ? "bg-white/20" : "bg-muted")}>{t.jumlah}</span>}
          </button>
        ))}
      </div>

      {!lokal ? <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat…</p> : null}

      {lokal && tab === "laporan" && (
        lokal.laporan.length === 0 ? (
          <Kosong ikon={ClipboardList} judul="Belum ada laporan dari perangkat ini" isi="Laporan kerusakan yang Anda kirim akan tercatat di sini lengkap dengan statusnya — tanpa perlu akun." aksi={<Button variant="teal" asChild><Link href="/lapor"><Send /> Lapor Kerusakan</Link></Button>} />
        ) : (
          <>
            <ul className="grid gap-3">
              {lokal.laporan.map((l) => {
                const st = status?.get(l.nomor);
                return (
                  <li key={l.nomor}>
                    <Card><CardContent className="grid gap-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-navy-800">{l.nomor}</span>
                        {st ? <Badge variant={badgeStatusPermintaan[st.status] ?? "default"}>{st.status}</Badge> : status ? <Badge variant="outline">Tidak ditemukan</Badge> : <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                      </div>
                      <p className="font-medium text-navy-800">{st?.namaAlat ?? l.namaAlat}</p>
                      <p className="text-xs text-muted-foreground">
                        Dikirim {waktu(l.waktu)}{st?.unit ? ` · ${st.unit}` : ""}{st && st.diperbarui !== st.dibuat ? ` · diperbarui ${waktu(st.diperbarui)}` : ""}
                      </p>
                      {st?.perintah && <p className="text-xs">Perintah kerja <span className="font-mono font-medium">{st.perintah.nomor}</span>: <strong>{st.perintah.status}</strong></p>}
                      <Langkah status={st?.status} wo={st?.perintah?.status} />
                      {st?.kodeAlat && <Link href={urlDetailAlat(st.kodeAlat)} className="text-xs font-medium text-teal-700 hover:underline">Lihat detail alat →</Link>}
                    </CardContent></Card>
                  </li>
                );
              })}
            </ul>
            <Hapus onHapus={() => hapusLokal("laporan")} teks="Hapus riwayat laporan di perangkat ini" />
          </>
        )
      )}

      {lokal && tab === "scan" && (
        lokal.scan.length === 0 ? (
          <Kosong ikon={ScanQrCode} judul="Belum ada alat yang dipindai" isi="Scan QR pada label alat untuk melihat detail inventaris atau melapor kerusakan. Alat yang dipindai akan muncul di sini." aksi={<Button variant="teal" onClick={bukaScan}><ScanQrCode /> Scan QR</Button>} />
        ) : (
          <>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
              {lokal.scan.map((s) => (
                <li key={s.kode} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-800">{s.nama}</p>
                    <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{s.kode}</span>{s.keterangan ? ` · ${s.keterangan}` : ""} · {waktu(s.waktu)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild><Link href={urlDetailAlat(s.kode)}><FileSearch /> Detail</Link></Button>
                    <Button size="sm" variant="teal" asChild><Link href={`/lapor?alat=${encodeURIComponent(s.kode)}`}><Send /> Lapor</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
            <Hapus onHapus={() => hapusLokal("scan")} teks="Hapus riwayat scan di perangkat ini" />
          </>
        )
      )}

      {tab === "akun" && masuk && (
        aktivitas.length === 0 ? <Kosong ikon={ShieldCheck} judul="Belum ada aktivitas" isi="Aktivitas akun Anda (masuk, unggah, perubahan data) akan tercatat di sini." /> : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {aktivitas.map((a) => (
              <li key={a.id} className="grid gap-0.5 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-navy-800">{LABEL_AKSI[a.aksi] ?? a.aksi}</span>
                  <span className="text-xs text-muted-foreground">{waktu(a.waktu)}</span>
                </div>
                {(a.objek || a.detail) && <p className="text-xs text-muted-foreground">{[a.objek, a.detail].filter(Boolean).join(" — ")}</p>}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** Tahapan laporan: Terkirim → Ditinjau → Diproses → Selesai (Ditolak ditandai merah). */
function Langkah({ status, wo }: { status?: string; wo?: string }) {
  if (!status) return null;
  const tahap = ["Baru", "Ditinjau", "Diproses", "Selesai"];
  const label = ["Terkirim", "Ditinjau", "Diproses", "Selesai"];
  const i = status === "Ditolak" ? -1 : Math.max(tahap.indexOf(status), wo === "Dikerjakan" ? 2 : 0);
  if (i < 0) return <p className="text-xs text-red-700">Laporan ditutup/ditolak petugas. Hubungi IPSRS/Elektromedik bila masih bermasalah.</p>;
  return (
    <ol className="mt-1 grid grid-cols-4 gap-1" aria-label={`Tahap laporan: ${label[i]}`}>
      {label.map((l, n) => (
        <li key={l} className="grid gap-1 text-center text-[11px]">
          <span className={cn("h-1.5 rounded-full", n <= i ? (i === 3 ? "bg-emerald-500" : "bg-teal-500") : "bg-muted")} />
          <span className={n <= i ? "font-medium text-navy-800" : "text-muted-foreground"}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

function Kosong({ ikon: Ikon, judul, isi, aksi }: { ikon: typeof History; judul: string; isi: string; aksi?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Ikon className="size-7" aria-hidden /></span>
      <h2 className="font-semibold text-navy-800">{judul}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{isi}</p>
      {aksi && <div className="mt-2">{aksi}</div>}
    </div>
  );
}

function Hapus({ onHapus, teks }: { onHapus: () => void; teks: string }) {
  return (
    <button type="button" onClick={() => { if (window.confirm(`${teks}? Laporan tetap tersimpan di server.`)) onHapus(); }}
      className="mx-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-700">
      <Trash2 className="size-3.5" /> {teks}
    </button>
  );
}
