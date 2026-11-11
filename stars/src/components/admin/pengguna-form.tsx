"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Pencil, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buatPengguna, setelUlangSandi, ubahPengguna, type StatusAksi } from "@/app/admin/pengguna/actions";

type Unit = { id: number; nama: string };

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-2 text-sm text-red-700"><XCircle className="size-4" /> {status.error}</p>
    : <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> {status.ok}</p>;
}

function PilihanPeranUnit({ units, peranBoleh, peran, unitKerjaId }: { units: Unit[]; peranBoleh: string[]; peran?: string; unitKerjaId?: number | null }) {
  return (
    <>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">Peran
        <Select name="peran" defaultValue={peran ?? "Operator"} required>{peranBoleh.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">Batas unit kerja (Operator)
        <Select name="unitKerjaId" defaultValue={unitKerjaId ?? ""}>
          <option value="">Semua unit</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </Select>
      </label>
    </>
  );
}

export function FormPenggunaBaru({ units, peranBoleh }: { units: Unit[]; peranBoleh: string[] }) {
  const [status, aksi, pending] = useActionState<StatusAksi, FormData>(buatPengguna, undefined);
  return (
    <form action={aksi} className="grid gap-3 md:grid-cols-6 md:items-end">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-1">Nama<Input name="nama" required minLength={2} /></label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2">Email<Input name="email" type="email" required /></label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">Sandi awal<Input name="sandi" type="text" required minLength={8} placeholder="min. 8 karakter" /></label>
      <PilihanPeranUnit units={units} peranBoleh={peranBoleh} />
      <div className="md:col-span-6 flex items-center justify-between gap-3">
        <Pesan status={status} />
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Tambah</Button>
      </div>
    </form>
  );
}

export function BarisPengguna({ pengguna: p, units, peranBoleh, sayaSendiri }: {
  pengguna: { id: number; nama: string; email: string; peran: string; unitKerjaId: number | null; unitKerja: string | null; aktif: boolean; terakhirLogin: string | null; terkunci: boolean };
  units: Unit[]; peranBoleh: string[]; sayaSendiri: boolean;
}) {
  const [buka, setBuka] = useState<"" | "ubah" | "sandi">("");
  const [stUbah, aksiUbah, pUbah] = useActionState<StatusAksi, FormData>(ubahPengguna, undefined);
  const [stSandi, aksiSandi, pSandi] = useActionState<StatusAksi, FormData>(setelUlangSandi, undefined);
  const bolehEdit = peranBoleh.length > 0;
  const tgl = p.terakhirLogin ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(p.terakhirLogin)) : "belum pernah";
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-navy-800">{p.nama} {sayaSendiri && <span className="text-xs text-muted-foreground">(Anda)</span>}</div>
          <div className="text-xs text-muted-foreground">{p.email} • login terakhir: {tgl}</div>
        </div>
        <Badge variant="teal">{p.peran}</Badge>
        {p.unitKerja && <Badge variant="outline">{p.unitKerja}</Badge>}
        {!p.aktif && <Badge variant="danger">Nonaktif</Badge>}
        {p.terkunci && <Badge variant="warning">Terkunci</Badge>}
        {bolehEdit && (
          <>
            <Button variant="outline" size="sm" onClick={() => setBuka(buka === "ubah" ? "" : "ubah")}><Pencil /> Ubah</Button>
            <Button variant="outline" size="sm" onClick={() => setBuka(buka === "sandi" ? "" : "sandi")}><KeyRound /> Sandi</Button>
          </>
        )}
      </div>
      {buka === "ubah" && (
        <form action={aksiUbah} className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-6 md:items-end">
          <input type="hidden" name="id" value={p.id} />
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Nama<Input name="nama" defaultValue={p.nama} required /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2">Email<Input name="email" type="email" defaultValue={p.email} required /></label>
          <PilihanPeranUnit units={units} peranBoleh={peranBoleh} peran={p.peran} unitKerjaId={p.unitKerjaId} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={p.aktif} disabled={sayaSendiri} /> Aktif</label>
          <div className="md:col-span-6 flex items-center justify-between gap-3"><Pesan status={stUbah} /><Button type="submit" size="sm" disabled={pUbah}>{pUbah ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Simpan perubahan</Button></div>
        </form>
      )}
      {buka === "sandi" && (
        <form action={aksiSandi} className="mt-3 flex flex-wrap items-end gap-3 border-t pt-3">
          <input type="hidden" name="id" value={p.id} />
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">Sandi baru<Input name="sandi" type="text" required minLength={8} placeholder="min. 8 karakter" /></label>
          <Button type="submit" size="sm" disabled={pSandi}>{pSandi ? <Loader2 className="animate-spin" /> : <KeyRound />} Setel ulang</Button>
          <Pesan status={stSandi} />
        </form>
      )}
    </div>
  );
}
