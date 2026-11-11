"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRIORITAS } from "@/lib/pemeliharaan";
import { buatPermintaan, type StatusLapor } from "./actions";

type Unit = { id: number; nama: string };

export function LaporForm({ units }: { units: Unit[] }) {
  const [status, aksi, pending] = useActionState<StatusLapor, FormData>(buatPermintaan, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  if (status?.nomor) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-lg font-bold text-navy-800">Laporan terkirim. Terima kasih!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Nomor laporan Anda — simpan untuk menanyakan status ke petugas:</p>
        <p className="mt-2 inline-block rounded-lg border border-emerald-300 bg-white px-4 py-2 font-mono text-lg font-bold text-emerald-700">{status.nomor}</p>
        <p className="mt-4 text-sm text-muted-foreground">Petugas Elektromedik/IPSRS akan menindaklanjuti. Untuk kerusakan darurat, tetap hubungi petugas secara langsung.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="teal" asChild><Link href="/lapor">Lapor lagi</Link></Button>
          <Button variant="outline" asChild><Link href="/">Kembali ke beranda</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={aksi} className="grid gap-4 rounded-2xl border bg-card p-6 shadow-card">
      {status?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {status.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-navy-800 sm:col-span-2">
          Nama / jenis alat yang bermasalah <span className="text-red-600">*</span>
          <Input name="namaAlat" required maxLength={200} placeholder="mis. Baby Incubator, Ventilator, AC ruang perawatan" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Unit kerja / lokasi
          <Select name="unitKerjaId" defaultValue="">
            <option value="">— Pilih unit (opsional) —</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Rincian lokasi
          <Input name="lokasi" maxLength={200} placeholder="mis. Ruang PERINA, bed 3" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Nama pelapor <span className="text-red-600">*</span>
          <Input name="pelapor" required maxLength={120} placeholder="Nama Anda" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Kontak (HP/ekstensi)
          <Input name="kontak" maxLength={120} placeholder="mis. 0812xxxx / ext. 123" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800 sm:col-span-2">
          Uraian keluhan / kerusakan <span className="text-red-600">*</span>
          <textarea name="keluhan" required maxLength={2000} rows={4}
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
            placeholder="Jelaskan gejala, kapan terjadi, dan dampaknya ke pelayanan." />
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Tingkat urgensi
          <Select name="prioritas" defaultValue="Normal">
            {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy-800">
          Foto (opsional, JPG/PNG, maks 5 MB)
          <Input name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-teal-700" />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">Data ini dipakai untuk penanganan pemeliharaan alat, bukan dipublikasikan.</p>
        <Button type="submit" variant="teal" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Kirim laporan
        </Button>
      </div>
    </form>
  );
}
