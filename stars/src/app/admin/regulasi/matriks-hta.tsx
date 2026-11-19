"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Format 3 Permenkes 51/2017: Matriks Penilaian Penetapan Topik PTK (skor 1–5 per kriteria). */
const KRITERIA = ["High-volume", "High-risk", "High-cost", "High-variability", "Tingkat kepentingan kebijakan penerapan teknologi", "Dampak terhadap perbaikan kesehatan", "Tingkat potensi penghematan biaya", "Tingkat penerimaan aspek sosial, budaya, etika, politik, dan agama"];

export function MatriksHta() {
  const [skor, setSkor] = useState<number[]>(Array(8).fill(0));
  const [info, setInfo] = useState({ topik: "", pengusul: "", penilai: "" });
  const total = skor.reduce((a, b) => a + b, 0);
  return (
    <div className="grid gap-3 print:text-black" id="matriks-hta">
      <div className="grid gap-2 sm:grid-cols-3">
        {(["topik", "pengusul", "penilai"] as const).map((k) => (
          <label key={k} className="grid gap-1 text-sm capitalize">{k === "topik" ? "Usulan topik" : k}
            <input value={info[k]} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} className="h-9 rounded-md border px-2" /></label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead><tr className="bg-amber-50">{["No", "Kriteria penilaian", "1", "2", "3", "4", "5", "Jumlah"].map((h) => <th key={h} className="border border-amber-300 px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {KRITERIA.map((k, i) => (
              <tr key={k}>
                <td className="border border-amber-300 px-2 text-center">{i + 1}</td>
                <td className={`border border-amber-300 px-2 py-1 ${i < 4 ? "italic" : ""}`}>{k}</td>
                {[1, 2, 3, 4, 5].map((n) => (
                  <td key={n} className="border border-amber-300 text-center">
                    <input type="radio" name={`k${i}`} aria-label={`${k} skor ${n}`} checked={skor[i] === n} onChange={() => setSkor((s) => s.map((v, j) => (j === i ? n : v)))} />
                  </td>
                ))}
                <td className="border border-amber-300 text-center font-medium">{skor[i] || ""}</td>
              </tr>
            ))}
            <tr className="font-semibold"><td colSpan={7} className="border border-amber-300 px-2 text-right">TOTAL</td><td className="border border-amber-300 text-center" data-testid="total-hta">{total}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Skor 5 nilai tertinggi, 1 terendah. Total maks. 40 — topik dengan skor tertinggi diprioritaskan (Gambar 3.1: skoring → kalkulasi → ranking → telaah → penetapan).</p>
      <Button size="sm" variant="outline" className="justify-self-start print:hidden" onClick={() => window.print()}><Printer /> Cetak matriks</Button>
    </div>
  );
}
