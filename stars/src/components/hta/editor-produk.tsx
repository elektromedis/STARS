"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bacaAngka, MAKS_SPESIFIKASI, type Spesifikasi } from "@/lib/hta-banding";
import { FOTO_ALAT, urlFotoAlat } from "@/lib/dokumen-alat";
import { perkecilGambar, unggahDenganKemajuan } from "@/lib/gambar";

export type ProdukForm = {
  id?: number; nama: string; merek: string; model: string; harga: string; garansiBulan: string; usiaTeknis: string; tkdn: string;
  akl: string; asal: string; penyedia: string; tautan: string; catatan: string; spesifikasi: Spesifikasi[]; foto: string | null;
};
export const produkKosong = (awal?: Partial<ProdukForm>): ProdukForm => ({
  nama: "", merek: "", model: "", harga: "", garansiBulan: "", usiaTeknis: "", tkdn: "", akl: "", asal: "", penyedia: "", tautan: "", catatan: "", spesifikasi: [], foto: null, ...awal,
});

function Bidang({ label, children, bantuan, className }: { label: string; children: React.ReactNode; bantuan?: string; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-navy-700">{label}</label>
      <div className="[&>*]:w-full">{isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}</div>
      {bantuan && <p className="mt-1 text-[11px] text-muted-foreground">{bantuan}</p>}
    </div>
  );
}

/**
 * Tambah/ubah data HTA produk. `kunciTerkunci` = data melengkapi model alat di inventaris (jenis/merek/tipe tidak boleh diubah
 * agar tetap tertaut). Setelah tersimpan → `onTersimpan(subjekId)`.
 */
export function EditorProduk({ awal, kunciTerkunci = false, saranParameter = [], onTutup, onTersimpan }: {
  awal: ProdukForm; kunciTerkunci?: boolean; saranParameter?: string[]; onTutup: () => void; onTersimpan: (subjek: string, id: number) => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<ProdukForm>(awal);
  const [kirim, setKirim] = useState(false);
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);
  const [foto, setFoto] = useState<string | null>(awal.foto);
  const [prosesFoto, setProsesFoto] = useState<string | null>(null);
  const tutupRef = useRef<HTMLButtonElement>(null);
  const idDaftar = useId();
  const ubah = (k: keyof ProdukForm, v: string) => setF((x) => ({ ...x, [k]: v }));
  const ubahSpek = (i: number, k: keyof Spesifikasi, v: string) => setF((x) => ({ ...x, spesifikasi: x.spesifikasi.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  useEffect(() => {
    tutupRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    const angka = (s: string) => (s.trim() ? bacaAngka(s) ?? s : null);
    const body = {
      nama: f.nama, merek: f.merek, model: f.model, harga: angka(f.harga), garansiBulan: angka(f.garansiBulan), usiaTeknis: angka(f.usiaTeknis), tkdn: angka(f.tkdn),
      akl: f.akl, asal: f.asal, penyedia: f.penyedia, tautan: f.tautan, catatan: f.catatan,
      spesifikasi: f.spesifikasi.filter((s) => s.parameter.trim()),
    };
    setKirim(true);
    const r = await fetch(f.id ? `/api/admin/hta/${f.id}` : "/api/admin/hta", { method: f.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { ok?: string; error?: string; subjek?: string; id?: number };
    setKirim(false);
    if (r?.ok && j.subjek && j.id) { setPesan({ ok: j.ok }); onTersimpan(j.subjek, j.id); router.refresh(); }
    else setPesan({ error: j.error ?? "Gagal menyimpan." });
  }

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !f.id) return;
    if (!file.type.startsWith("image/") || file.size > FOTO_ALAT.maksAsli) { setPesan({ error: "Pilih gambar JPG/PNG (maks 25 MB)." }); return; }
    try {
      setProsesFoto("Memperkecil…");
      const [utama, kecil] = await Promise.all([perkecilGambar(file, FOTO_ALAT.sisiBesar, FOTO_ALAT.kualitas), perkecilGambar(file, FOTO_ALAT.sisiKecil, 0.8, true)]);
      const fd = new FormData();
      fd.set("foto", new File([utama], "foto.jpg", { type: "image/jpeg" }));
      fd.set("kecil", new File([kecil], "kecil.jpg", { type: "image/jpeg" }));
      const r = await unggahDenganKemajuan(`/api/admin/hta/${f.id}/foto`, fd, (p) => setProsesFoto(`Mengunggah… ${p}%`));
      if (r.status === 200) { setFoto(String(r.data.foto)); router.refresh(); } else setPesan({ error: String(r.data.error ?? "Gagal mengunggah foto.") });
    } catch { setPesan({ error: "Foto tidak dapat diproses." }); } finally { setProsesFoto(null); }
  }

  async function hapusFoto() {
    if (!f.id || !window.confirm("Hapus foto produk?")) return;
    const r = await fetch(`/api/admin/hta/${f.id}/foto`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { setFoto(null); router.refresh(); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
      <div role="dialog" aria-modal="true" aria-label="Data HTA produk" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-navy-800">{f.id ? "Ubah data HTA produk" : kunciTerkunci ? "Lengkapi data HTA" : "Tambah produk kandidat"}</h2>
            <p className="text-xs text-muted-foreground">{kunciTerkunci ? "Data operasional (kerusakan, kalibrasi, dokumen) dihitung otomatis dari inventaris." : "Mis. produk e-Katalog yang sedang dipertimbangkan untuk pengadaan."}</p>
          </div>
          <Button ref={tutupRef} type="button" variant="ghost" size="icon" onClick={onTutup} aria-label="Tutup"><X className="size-5" /></Button>
        </div>
        <form onSubmit={simpan} className="grid gap-5 overflow-y-auto px-5 py-4">
          <fieldset className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">Identitas produk</legend>
            <Bidang label="Jenis alat *"><Input value={f.nama} onChange={(e) => ubah("nama", e.target.value)} required minLength={2} maxLength={150} disabled={kunciTerkunci} placeholder="Infusion Pump" /></Bidang>
            <Bidang label="Merek"><Input value={f.merek} onChange={(e) => ubah("merek", e.target.value)} maxLength={100} disabled={kunciTerkunci} placeholder="Terumo" /></Bidang>
            <Bidang label="Tipe / model"><Input value={f.model} onChange={(e) => ubah("model", e.target.value)} maxLength={150} disabled={kunciTerkunci} placeholder="TE-171" /></Bidang>
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-4 [&>*]:min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">Ekonomi & kebijakan</legend>
            <Bidang label="Harga per unit (Rp)" bantuan="Termasuk PPN" className="sm:col-span-2"><Input inputMode="decimal" value={f.harga} onChange={(e) => ubah("harga", e.target.value)} placeholder="45.000.000" /></Bidang>
            <Bidang label="Garansi (bulan)"><Input inputMode="numeric" value={f.garansiBulan} onChange={(e) => ubah("garansiBulan", e.target.value)} placeholder="24" /></Bidang>
            <Bidang label="Umur teknis (tahun)"><Input inputMode="numeric" value={f.usiaTeknis} onChange={(e) => ubah("usiaTeknis", e.target.value)} placeholder="8" /></Bidang>
            <Bidang label="TKDN (%)"><Input inputMode="decimal" value={f.tkdn} onChange={(e) => ubah("tkdn", e.target.value)} placeholder="25,5" /></Bidang>
            <Bidang label="No. izin edar AKL/AKD"><Input value={f.akl} onChange={(e) => ubah("akl", e.target.value)} maxLength={100} placeholder="AKL 20902…" /></Bidang>
            <Bidang label="Negara asal"><Input value={f.asal} onChange={(e) => ubah("asal", e.target.value)} maxLength={100} placeholder="Jepang" /></Bidang>
            <Bidang label="Distributor / service center"><Input value={f.penyedia} onChange={(e) => ubah("penyedia", e.target.value)} maxLength={200} /></Bidang>
            <Bidang label="Tautan e-Katalog / brosur" className="sm:col-span-4"><Input type="url" value={f.tautan} onChange={(e) => ubah("tautan", e.target.value)} maxLength={500} placeholder="https://e-katalog.lkpp.go.id/…" /></Bidang>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">Spesifikasi teknis</legend>
            <p className="text-xs text-muted-foreground">Pakai nama parameter yang sama di setiap produk agar bisa dibandingkan (mis. &quot;Baterai&quot;, satuan &quot;jam&quot;). Pilih arah agar STARS tahu mana yang lebih baik.</p>
            <datalist id={idDaftar}>{saranParameter.map((s) => <option key={s} value={s} />)}</datalist>
            {f.spesifikasi.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] [&>*]:min-w-0">
                <Input aria-label={`Parameter ${i + 1}`} list={idDaftar} value={s.parameter} onChange={(e) => ubahSpek(i, "parameter", e.target.value)} placeholder="Parameter" maxLength={80} className="col-span-2 sm:col-span-1" />
                <Input aria-label={`Nilai ${i + 1}`} value={s.nilai} onChange={(e) => ubahSpek(i, "nilai", e.target.value)} placeholder="Nilai" maxLength={120} />
                <Input aria-label={`Satuan ${i + 1}`} value={s.satuan} onChange={(e) => ubahSpek(i, "satuan", e.target.value)} placeholder="Satuan" maxLength={30} />
                <Select aria-label={`Arah ${i + 1}`} value={s.arah} onChange={(e) => ubahSpek(i, "arah", e.target.value)}>
                  <option value="tinggi">Lebih tinggi lebih baik</option>
                  <option value="rendah">Lebih rendah lebih baik</option>
                  <option value="-">Info saja</option>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => setF((x) => ({ ...x, spesifikasi: x.spesifikasi.filter((_, j) => j !== i) }))} aria-label={`Hapus parameter ${i + 1}`}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={f.spesifikasi.length >= MAKS_SPESIFIKASI}
              onClick={() => setF((x) => ({ ...x, spesifikasi: [...x.spesifikasi, { parameter: "", nilai: "", satuan: "", arah: "tinggi" }] }))}><Plus /> Tambah parameter</Button>
          </fieldset>
          <Bidang label="Catatan tim HTA"><textarea value={f.catatan} onChange={(e) => ubah("catatan", e.target.value)} maxLength={2000} rows={3} className="rounded-md border border-input bg-card px-3 py-2 text-sm" placeholder="Masukan klinis pengguna, hasil uji coba, kendala suku cadang, …" /></Bidang>
          {f.id && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto dari API sendiri */}
              {foto ? <img src={urlFotoAlat(foto, true)!} alt="" className="size-14 rounded-lg object-cover" /> : <span className="text-sm text-muted-foreground">Belum ada foto produk.</span>}
              <Button asChild variant="outline" size="sm"><label className="cursor-pointer">{prosesFoto ? <Loader2 className="animate-spin" /> : <Camera />} {foto ? "Ganti foto" : "Pasang foto"}<input type="file" accept="image/*" className="sr-only" onChange={pilihFoto} disabled={Boolean(prosesFoto)} /></label></Button>
              {foto && <Button type="button" variant="ghost" size="sm" onClick={hapusFoto}><Trash2 /> Hapus foto</Button>}
              {prosesFoto && <span className="text-xs text-muted-foreground">{prosesFoto}</span>}
            </div>
          )}
          {!f.id && !kunciTerkunci && <p className="text-xs text-muted-foreground">Foto produk dapat dipasang setelah data disimpan.</p>}
          {pesan?.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{pesan.error}</p>}
          {pesan?.ok && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{pesan.ok}</p>}
          <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t bg-card px-5 py-3">
            <Button type="button" variant="outline" onClick={onTutup}>Tutup</Button>
            <Button type="submit" variant="teal" disabled={kirim}>{kirim && <Loader2 className="animate-spin" />} Simpan</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
