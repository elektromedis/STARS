"use client";

/** Tombol hapus EMASCARE dengan konfirmasi browser; aksi server dikirim lewat prop. */
export function HapusKonfirmasi({ aksi, id, pesan, label = "Hapus" }: { aksi: (f: FormData) => Promise<void>; id: number; pesan: string; label?: string }) {
  return (
    <form action={aksi} onSubmit={(e) => { if (!window.confirm(pesan)) e.preventDefault(); }} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className="kapsul bahaya !py-1 text-[12px]" title="Hapus laporan yang salah input / tidak jadi">{label}</button>
    </form>
  );
}
