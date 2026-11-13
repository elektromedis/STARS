import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { opsiRkbu } from "@/lib/rkbu-data";
import { bacaIsiRkbu } from "@/lib/rkbu-simpan";
import { EditorRkbu } from "@/components/rkbu/editor-rkbu";

export const dynamic = "force-dynamic";

async function ambil(idTeks: string) {
  const id = Number(idTeks);
  return Number.isInteger(id) && id > 0 ? prisma.dokumenRkbu.findUnique({ where: { id } }) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await ambil((await params).id).catch(() => null);
  return { title: d ? `${d.judul} — Cetak RKBU` : "Dokumen RKBU" };
}

export default async function RkbuDokumenPage({ params }: { params: Promise<{ id: string }> }) {
  await sesiHalaman("Viewer");
  const s = await auth();
  const d = await ambil((await params).id);
  const isi = d ? bacaIsiRkbu(d.isi) : null;
  if (!d || !isi) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-card">
        <h1 className="text-lg font-semibold text-navy-800">{d ? "Isi dokumen tidak dapat dibaca" : "Dokumen tidak ditemukan"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{d ? "Data tersimpan rusak atau dari versi yang tidak dikenali." : "Mungkin sudah dihapus."}</p>
        <Link href="/rkbu" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline">← Kembali ke daftar dokumen</Link>
      </div>
    );
  }
  const kunci = await unitTerkunci();
  const opsi = await opsiRkbu(kunci?.nama);
  const bolehUbah = cukup(s?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  return (
    <EditorRkbu awal={{ id: d.id, judul: d.judul, isi, diperbarui: d.updatedAt.toISOString(), oleh: d.diubahOleh }} opsi={opsi} bolehUbah={bolehUbah}
      alasanBaca={process.env.STARS_MODE === "internet" ? "Server mode internet bersifat baca saja — dokumen bisa dicetak tetapi tidak disimpan." : "Peran Anda Viewer: dokumen bisa diubah & dicetak, tetapi menyimpan perlu peran Operator."} />
  );
}
