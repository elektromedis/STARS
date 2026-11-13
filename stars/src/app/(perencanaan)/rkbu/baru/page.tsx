import type { Metadata } from "next";
import { auth } from "@/auth";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { first, TAHAP_URUT, type SearchParams } from "@/lib/filter";
import { isiBaru, opsiRkbu } from "@/lib/rkbu-data";
import { bacaIsiRkbu } from "@/lib/rkbu-simpan";
import { idBaru, type IsiRkbu } from "@/lib/rkbu";
import { EditorRkbu } from "@/components/rkbu/editor-rkbu";

export const metadata: Metadata = { title: "Dokumen RKBU baru" };
export const dynamic = "force-dynamic";

export default async function RkbuBaruPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await sesiHalaman("Viewer");
  const s = await auth();
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const opsi = await opsiRkbu(kunci?.nama);

  let isi: IsiRkbu;
  let judul: string;
  const salin = Number(first(sp.salin));
  const asal = Number.isInteger(salin) && salin > 0 ? await prisma.dokumenRkbu.findUnique({ where: { id: salin }, select: { judul: true, isi: true } }) : null;
  const isiAsal = asal ? bacaIsiRkbu(asal.isi) : null;
  if (asal && isiAsal) {
    isi = { ...isiAsal, baris: isiAsal.baris.map((b) => ({ ...b, id: idBaru() })) };
    judul = `Salinan ${asal.judul}`.slice(0, 200);
  } else {
    const [tahunT, tahapT] = (first(sp.tt) ?? "").split("|");
    const tahun = Number(tahunT) || new Date().getFullYear();
    const tahap = (TAHAP_URUT as readonly string[]).includes(tahapT) ? tahapT : "Ranwal";
    const jenis = first(sp.jenis) === "Pengadaan" ? "Pengadaan" : "Pemeliharaan";
    const unit = first(sp.unit) || null;
    const rekening = first(sp.rekening) || null;
    isi = first(sp.isi) === "kosong"
      ? await isiBaru({ jenis, tahun, tahap, dariPaket: false }, kunci?.nama)
      : await isiBaru({ jenis, tahun, tahap, unit, rekening, dariPaket: true }, kunci?.nama);
    const nama = isi.identitas.find((i) => /nama unit/i.test(i.label))?.nilai;
    judul = `${jenis === "Pengadaan" ? "RKBU" : "RKPBU"} ${unit ?? nama ?? ""} ${tahap} ${tahun}`.replace(/\s+/g, " ").trim();
  }
  const bolehUbah = cukup(s?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  return (
    <EditorRkbu awal={{ id: null, judul, isi, diperbarui: null, oleh: null }} opsi={opsi} bolehUbah={bolehUbah}
      alasanBaca={process.env.STARS_MODE === "internet" ? "Server mode internet bersifat baca saja — dokumen bisa dicetak tetapi tidak disimpan." : "Peran Anda Viewer: dokumen bisa diubah & dicetak, tetapi menyimpan perlu peran Operator."} />
  );
}
