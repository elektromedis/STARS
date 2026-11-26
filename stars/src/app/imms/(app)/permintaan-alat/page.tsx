import { sesiImms } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { fmtTgl } from "@/lib/imms";
import { KEPUTUSAN_PERMINTAAN_ALAT, MAKS_ITEM, unitBatas } from "@/lib/emascare";
import { ajukanPermintaanAlat, batalkanPermintaanAlat, catatTerpenuhi, putuskanPermintaanAlat } from "@/app/imms/actions-trilux";
import { Kosong, Lencana } from "@/components/imms/ui";

export const metadata = { title: "Permintaan Alat" };
export const dynamic = "force-dynamic";
const NADA: Record<string, string> = { Baru: "biru", Pengadaan: "kuning", Mutasi: "kuning", Relokasi: "kuning", Selesai: "hijau", Ditolak: "merah", Dibatalkan: "" };

export default async function PermintaanAlat({ searchParams }: { searchParams: Promise<{ ok?: string; s?: string }> }) {
  await sesiImms();
  const sp = await searchParams; const s = await auth();
  const unit = s?.user ? unitBatas(s.user) : null;
  const teknisi = cukup(s?.user.peran, "Operator"), pimpinan = cukup(s?.user.peran, "Admin");
  const baca = s?.user.peran === "Tamu" || s?.user.peran === "Dosen";
  const aktif = sp.s !== "tutup";
  const daftar = await prisma.permintaanAlat.findMany({
    where: { ...(unit ? { unitKerjaId: unit } : {}), status: aktif ? { in: ["Baru", "Pengadaan", "Mutasi", "Relokasi"] } : { in: ["Selesai", "Ditolak", "Dibatalkan"] } },
    orderBy: { id: "desc" }, take: 200, include: { item: true, unitKerja: { select: { nama: true } } },
  });
  const unitDaftar = unit || baca ? [] : await prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }] });
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      {!baca && <section className="kaca panel h-fit" aria-label="Permintaan alat baru">
        <h2>Permintaan alat baru</h2>
        <form action={ajukanPermintaanAlat} className="space-y-3">
          {unitDaftar.length > 0 && <div><label className="lbl" htmlFor="unitKerjaId">Unit kerja</label><select id="unitKerjaId" name="unitKerjaId" defaultValue={s?.user.unitKerjaId ?? ""}><option value="">—</option>{unitDaftar.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></div>}
          <div><label className="lbl" htmlFor="ruangan">Ruangan</label><input id="ruangan" name="ruangan" className="isian" maxLength={120} /></div>
          <div><label className="lbl">Alat yang diminta</label>
            <div className="grid gap-1.5">{Array.from({ length: MAKS_ITEM }, (_, i) => i).slice(0, 5).map((i) => <div key={i} className="flex gap-1.5"><input name={`nama_${i}`} className="isian flex-1" placeholder={`Nama alat ${i + 1}${i === 0 ? " (wajib)" : ""}`} maxLength={160} required={i === 0} aria-label={`Nama alat ${i + 1}`} /><input name={`jumlah_${i}`} type="number" min={1} max={1000} defaultValue={1} className="isian !w-16" aria-label={`Jumlah ${i + 1}`} /></div>)}</div></div>
          <div><label className="lbl" htmlFor="uraian">Alasan / keperluan</label><textarea id="uraian" name="uraian" rows={3} required minLength={5} maxLength={1000} placeholder="Mengapa alat diperlukan, kondisi alat saat ini, dampak pada pelayanan…" /></div>
          <button className="kapsul utama w-full">Kirim permintaan</button>
          <p className="redup2 text-[11px]">Keputusan: pengadaan, mutasi, relokasi, atau ditolak — oleh kepala instalasi/pimpinan.</p>
        </form>
      </section>}
      <section className="space-y-3" aria-label="Daftar permintaan alat">
        {sp.ok && <p role="status" className="text-[13px]" style={{ color: "var(--hijau)" }}>✓ {sp.ok}</p>}
        <div className="flex gap-2"><a href="/imms/permintaan-alat" className={`kapsul ${aktif ? "utama" : ""}`}>Berjalan</a><a href="/imms/permintaan-alat?s=tutup" className={`kapsul ${!aktif ? "utama" : ""}`}>Selesai / ditolak</a></div>
        {daftar.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada permintaan.</Kosong></div> : daftar.map((p) => (
          <article key={p.id} className="kaca panel text-[13px]">
            <div className="flex flex-wrap items-center gap-2"><b>{p.nomor}</b><Lencana t={p.status} nada={NADA[p.status]} /><span className="redup2 text-[12px]">{p.unitKerja?.nama}{p.ruangan ? ` · ${p.ruangan}` : ""} · {p.pemohon} · {fmtTgl(p.createdAt)}</span></div>
            <p className="my-1 whitespace-pre-wrap">{p.uraian}</p>
            {p.status === "Baru" && pimpinan && !baca ? (
              <form action={putuskanPermintaanAlat} className="space-y-2"><input type="hidden" name="id" value={p.id} />
                <ul className="grid gap-1">{p.item.map((it) => <li key={it.id} className="flex items-center gap-2">{it.namaAlat} <span className="redup2">diminta {it.jumlah}</span> <label className="redup2 ml-auto text-[12px]">disetujui <input name={`setuju_${it.id}`} type="number" min={0} max={it.jumlah} defaultValue={it.jumlah} className="isian !inline-block !w-16 !py-1" /></label></li>)}</ul>
                <div className="flex flex-wrap gap-2"><select name="keputusan" required defaultValue="" aria-label="Keputusan" className="!w-auto"><option value="" disabled>Keputusan…</option>{KEPUTUSAN_PERMINTAAN_ALAT.map((k) => <option key={k}>{k}</option>)}</select><input name="catatan" placeholder="Catatan / alasan tolak" className="isian flex-1" maxLength={500} /><button className="kapsul utama">Putuskan</button></div></form>
            ) : (
              <ul className="grid gap-0.5">{p.item.map((it) => <li key={it.id}>• {it.namaAlat} — diminta {it.jumlah}{it.jumlahSetuju != null && <>, disetujui {it.jumlahSetuju}, terpenuhi {it.jumlahTerpenuhi}</>}</li>)}</ul>)}
            {p.catatanKeputusan && <div className="redup2 mt-1 text-[12px]">Keputusan {p.diputuskanOleh} ({fmtTgl(p.diputuskanPada)}): {p.catatanKeputusan}</div>}
            {teknisi && !baca && ["Pengadaan", "Mutasi", "Relokasi"].includes(p.status) && (
              <form action={catatTerpenuhi} className="mt-2 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={p.id} />
                {p.item.map((it) => <label key={it.id} className="redup2 text-[12px]">{it.namaAlat} terpenuhi <input name={`penuh_${it.id}`} type="number" min={0} max={it.jumlahSetuju ?? it.jumlah} defaultValue={it.jumlahTerpenuhi} className="isian !inline-block !w-16 !py-1" /></label>)}<button className="kapsul">Catat terpenuhi</button></form>)}
            {p.status === "Baru" && !baca && (p.emailPemohon === s?.user.email || teknisi) && <form action={batalkanPermintaanAlat} className="mt-2"><input type="hidden" name="id" value={p.id} /><button className="kapsul bahaya !py-1 text-[12px]">Batalkan</button></form>}
          </article>))}
      </section>
    </div>
  );
}
