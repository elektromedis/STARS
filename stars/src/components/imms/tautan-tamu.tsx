"use client";
import { useActionState, useState } from "react";
import { buatTautanTamu, cabutTautanTamu, type StatusTamu } from "@/app/imms/actions";

const tgl = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** Admin: buat / cabut tautan pratinjau baca-saja untuk tamu (mis. dosen pembimbing). */
export function TautanTamu({ aktif }: { aktif: { sampai: string; ket: string | null } | null }) {
  const [st, buat, jalan] = useActionState<StatusTamu, FormData>(buatTautanTamu, undefined);
  const [cabut, setCabut] = useState<StatusTamu>();
  const [salin, setSalin] = useState(false);
  const url = st?.token ? `${location.origin}/imms/tamu?t=${st.token}` : null;
  const berlaku = cabut?.ok ? null : st?.sampai ? { sampai: st.sampai, ket: null } : aktif;
  return (
    <div className="space-y-3 text-[13px]">
      <p className="redup">Penerima tautan bisa melihat EMASCARE <b>tanpa akun</b>, hanya baca (setara Pengguna ruangan), dan tidak bisa membuka STARS atau mengubah data. Membuat tautan baru otomatis mematikan tautan lama.</p>
      <form action={buat} className="flex flex-wrap items-end gap-2">
        <div><label className="lbl" htmlFor="ket">Untuk siapa</label><input id="ket" name="ket" className="isian" placeholder="mis. Dosen pembimbing" maxLength={120} /></div>
        <div><label className="lbl" htmlFor="hari">Berlaku</label>
          <select id="hari" name="hari" defaultValue="7">{[1, 3, 7, 14, 30].map((h) => <option key={h} value={h}>{h} hari</option>)}</select></div>
        <button className="kapsul utama" disabled={jalan}>Buat tautan</button>
      </form>
      {url && !cabut?.ok && (
        <div className="kaca rounded-xl p-3">
          <p className="mb-1 font-semibold">Tautan pratinjau (hanya tampil sekali — salin sekarang):</p>
          <div className="flex gap-2"><input readOnly value={url} className="isian flex-1" onFocus={(e) => e.target.select()} aria-label="Tautan pratinjau" />
            <button type="button" className="kapsul" onClick={() => navigator.clipboard?.writeText(url).then(() => setSalin(true))}>{salin ? "Tersalin" : "Salin"}</button></div>
        </div>
      )}
      {berlaku ? (
        <p className="flex flex-wrap items-center gap-2">Tautan aktif sampai <b>{tgl(berlaku.sampai)}</b>{berlaku.ket ? ` · ${berlaku.ket}` : ""}
          <button type="button" className="kapsul" onClick={async () => setCabut(await cabutTautanTamu())}>Cabut sekarang</button></p>
      ) : <p className="redup">{cabut?.ok ?? "Belum ada tautan aktif."}</p>}
    </div>
  );
}
