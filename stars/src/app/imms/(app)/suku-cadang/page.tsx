import { sesiImms } from "@/lib/imms-sesi";
import { prisma } from "@/lib/prisma";
import { fmtRp, fmtTgl } from "@/lib/imms";
import { Cari, Kartu, Kosong, Lencana, Tabel } from "@/components/imms/ui";

export default async function SukuCadang({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await sesiImms("Operator");
  const q = ((await searchParams).q ?? "").trim();
  const [barang, pakai] = await Promise.all([
    prisma.barangStok.findMany({ where: { aktif: true, ...(q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }, { alatTerkait: { contains: q } }] } : {}) }, orderBy: { nama: "asc" }, take: 500 }),
    prisma.perintahKerja.findMany({ where: { sukuCadang: { not: null }, status: "Selesai" }, orderBy: { tanggalSelesai: "desc" }, take: 15, select: { nomor: true, sukuCadang: true, biaya: true, tanggalSelesai: true, alat: { select: { nama: true } } } }),
  ]);
  const kritis = barang.filter((b) => b.stok <= b.stokMinimum).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><Kartu judul="Jenis barang" nilai={barang.length} /><Kartu judul="Di bawah stok minimum" nilai={kritis} nada={kritis ? "merah" : undefined} /><Kartu judul="Nilai persediaan" nilai={fmtRp(barang.reduce((s, b) => s + b.stok * (b.harga ?? 0), 0))} /></div>
      <p className="redup text-[13px]">Pengendalian suku cadang (WHO IMMIS): stok dikelola di menu Stok STARS; IMMS menampilkan ketersediaan dan pemakaian pada perintah kerja.</p>
      <Cari q={q} placeholder="Cari suku cadang / BHP / alat terkait…" />
      {barang.length === 0 ? <div className="kaca panel"><Kosong>Belum ada data stok.</Kosong></div> : (
        <Tabel><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Stok</th><th>Minimum</th><th>Alat terkait</th><th>Kedaluwarsa</th></tr></thead>
          <tbody>{barang.map((b) => (
            <tr key={b.id}><td className="redup">{b.kode}</td><td>{b.nama}</td><td><Lencana t={b.jenis} nada="" /></td>
              <td style={b.stok <= b.stokMinimum ? { color: "var(--merah)", fontWeight: 600 } : undefined}>{b.stok <= b.stokMinimum ? "⚠ " : ""}{b.stok} {b.satuan}</td>
              <td className="redup">{b.stokMinimum}</td><td className="redup">{b.alatTerkait ?? "—"}</td><td className="redup">{fmtTgl(b.kedaluwarsa)}</td></tr>
          ))}</tbody></Tabel>
      )}
      {pakai.length > 0 && (
        <section className="kaca panel"><h2>Pemakaian terakhir pada perintah kerja</h2>
          <table className="tabel"><thead><tr><th>Nomor</th><th>Alat</th><th>Suku cadang</th><th>Biaya</th><th>Selesai</th></tr></thead>
            <tbody>{pakai.map((p) => <tr key={p.nomor}><td>{p.nomor}</td><td>{p.alat?.nama ?? "—"}</td><td>{p.sukuCadang}</td><td>{fmtRp(p.biaya)}</td><td className="redup">{fmtTgl(p.tanggalSelesai)}</td></tr>)}</tbody></table></section>
      )}
    </div>
  );
}
