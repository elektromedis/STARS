import Link from "next/link";
import { kebutuhanSparepart } from "@/lib/kebutuhan-sparepart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Ringkasan kebutuhan sparepart 90 hari ke depan dari jadwal preventif (Master Tugas › suku cadang) vs stok. */
export async function KebutuhanSparepart({ hari = 90 }: { hari?: number }) {
  const d = await kebutuhanSparepart(hari);
  const kurang = d.filter((x) => x.kurang > 0).length;
  return (
    <Card id="kebutuhan-sparepart">
      <CardHeader>
        <CardTitle>Kebutuhan sparepart {hari} hari ke depan</CardTitle>
        <CardDescription>
          Dihitung dari jadwal preventif yang jatuh tempo × daftar suku cadang pada <Link href="/admin/tugas" className="text-teal-700 underline">Master Tugas</Link> (tulis satu per baris, jumlah boleh &quot;x 2&quot;), lalu dicocokkan dengan stok Sparepart/BHP-BMHP berdasarkan nama.
          {d.length > 0 && <> <b>{kurang}</b> item kurang dari kebutuhan.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!d.length ? <p className="text-sm text-muted-foreground">Belum ada jadwal preventif bertugas dengan daftar suku cadang dalam {hari} hari ke depan.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Suku cadang</th><th className="text-right">Dibutuhkan</th><th className="text-right">Stok</th><th className="text-right">Kurang</th><th>Tugas</th></tr></thead>
            <tbody>{d.map((x) => (
              <tr key={x.nama} className="border-b">
                <td className="py-1.5">{x.nama}{!x.barang.length && <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-900">belum ada di stok</span>}</td>
                <td className="text-right tabular-nums">{x.butuh} <span className="text-xs text-muted-foreground">({x.jadwal} jadwal)</span></td>
                <td className="text-right tabular-nums">{x.tersedia}</td>
                <td className={x.kurang ? "text-right font-semibold tabular-nums text-red-700" : "text-right tabular-nums text-emerald-700"}>{x.kurang || "cukup"}</td>
                <td className="text-xs text-muted-foreground">{x.tugas.join(", ")}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
