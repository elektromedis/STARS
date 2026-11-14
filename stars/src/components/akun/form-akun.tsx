"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, KeyRound, Loader2, LogIn, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/ui/input-sandi";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { daftar, mintaSetelUlang, setelSandiBaru, type StatusAkun } from "@/app/login/akun-actions";
import { PesanAkun } from "./bingkai-akun";

const Label = ({ children, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className="grid gap-1.5 text-sm font-medium" {...p}>{children}</label>;
const Kembali = () => <Button variant="ghost" size="sm" className="mt-3 w-full" asChild><Link href="/login"><ArrowLeft /> Kembali ke Masuk</Link></Button>;

export function FormDaftar({ units }: { units: { id: number; nama: string }[] }) {
  const [st, aksi, pending] = useActionState<StatusAkun, FormData>(daftar, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar akun STARS</CardTitle>
        <CardDescription>Akun aktif setelah diperiksa & disetujui Admin STARS. Admin juga menentukan peran (Viewer/Operator) Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        {st?.ok ? (
          <div className="grid gap-3"><PesanAkun status={st} /><Button asChild><Link href="/login"><LogIn /> Ke halaman Masuk</Link></Button></div>
        ) : (
          <form action={aksi} className="grid gap-4">
            {/* jebakan bot: disembunyikan dari manusia */}
            <input type="text" name="situs" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <Label>Nama lengkap<Input name="nama" required minLength={2} maxLength={100} autoComplete="name" /></Label>
            <Label>Email<Input name="email" type="email" required autoComplete="email" placeholder="nama@rsudcipayung.go.id" /></Label>
            <Label>Unit kerja
              <Select name="unitKerjaId" defaultValue="">
                <option value="">— pilih unit (opsional) —</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </Select>
            </Label>
            <Label>Jabatan / keperluan<Input name="catatan" required minLength={3} maxLength={300} placeholder="mis. Teknisi Elektromedis, input data kalibrasi" /></Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label htmlFor="daftar-sandi">Sandi<InputSandi id="daftar-sandi" name="sandi" required minLength={8} autoComplete="new-password" /></Label>
              <Label htmlFor="daftar-ulang">Ulangi sandi<InputSandi id="daftar-ulang" name="ulang" required minLength={8} autoComplete="new-password" /></Label>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">Minimal 8 karakter, berisi huruf dan angka.</p>
            <PesanAkun status={st} />
            <Button type="submit" disabled={pending} className="w-full">{pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Kirim pendaftaran</Button>
          </form>
        )}
        <Kembali />
      </CardContent>
    </Card>
  );
}

export function FormLupa() {
  const [st, aksi, pending] = useActionState<StatusAkun, FormData>(mintaSetelUlang, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lupa sandi</CardTitle>
        <CardDescription>Masukkan email akun STARS Anda. Kami kirim tautan untuk membuat sandi baru (berlaku 30 menit).</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={aksi} className="grid gap-4">
          <Label>Email<Input name="email" type="email" required autoComplete="username" placeholder="nama@rsudcipayung.go.id" /></Label>
          <PesanAkun status={st} />
          <Button type="submit" disabled={pending} className="w-full">{pending ? <Loader2 className="animate-spin" /> : <Mail />} Kirim tautan</Button>
        </form>
        <Kembali />
      </CardContent>
    </Card>
  );
}

export function FormSetelSandi({ token }: { token: string }) {
  const [st, aksi, pending] = useActionState<StatusAkun, FormData>(setelSandiBaru, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat sandi baru</CardTitle>
        <CardDescription>Minimal 8 karakter, berisi huruf dan angka.</CardDescription>
      </CardHeader>
      <CardContent>
        {st?.ok ? (
          <div className="grid gap-3"><PesanAkun status={st} /><Button asChild><Link href="/login"><LogIn /> Masuk</Link></Button></div>
        ) : (
          <form action={aksi} className="grid gap-4">
            <input type="hidden" name="token" value={token} />
            <Label htmlFor="setel-sandi">Sandi baru<InputSandi id="setel-sandi" name="sandi" required minLength={8} autoComplete="new-password" /></Label>
            <Label htmlFor="setel-ulang">Ulangi sandi baru<InputSandi id="setel-ulang" name="ulang" required minLength={8} autoComplete="new-password" /></Label>
            <PesanAkun status={st} />
            <Button type="submit" disabled={pending} className="w-full">{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Simpan sandi baru</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
