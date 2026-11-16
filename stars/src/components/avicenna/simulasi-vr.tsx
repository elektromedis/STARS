"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pratinjau modul latihan AVICENNA (versi layar datar dari skenario VR): peserta memilih langkah yang benar
 * pada tiap tahap; skor & umpan balik langsung. Tidak menyimpan data peserta.
 */
type Langkah = { tanya: string; pilihan: string[]; benar: number; alasan: string };
type Modul = { id: string; nama: string; adegan: string; langkah: Langkah[] };

const MODUL: Modul[] = [
  {
    id: "defib", nama: "Defibrilator (AED / manual)", adegan: "Ruang IGD · pasien henti jantung, ritme VF di monitor",
    langkah: [
      { tanya: "Apa yang dilakukan pertama kali setelah alat menyala?", pilihan: ["Langsung tekan SHOCK", "Pasang pad sesuai posisi (sternum–apeks) dan analisis ritme", "Atur energi 360 J lalu tunggu"], benar: 1, alasan: "Pad harus terpasang benar dan ritme dianalisis dulu; shock hanya untuk ritme yang bisa di-shock." },
      { tanya: "Sebelum menekan SHOCK, operator harus…", pilihan: ["Memastikan tidak ada yang menyentuh pasien (\"Semua menjauh!\")", "Mematikan monitor", "Melepas satu pad"], benar: 0, alasan: "Keselamatan tim: arus defibrilasi dapat mencederai orang yang menyentuh pasien atau tempat tidur." },
      { tanya: "Setelah shock diberikan, langkah berikutnya…", pilihan: ["Cek nadi selama 1 menit", "Lanjutkan RJP 2 menit segera", "Ulangi shock langsung"], benar: 1, alasan: "Pedoman resusitasi: RJP segera dilanjutkan 2 menit sebelum analisis ulang." },
      { tanya: "Pemeriksaan harian alat oleh pengguna mencakup…", pilihan: ["Uji diri (self-test), baterai, pad tidak kedaluwarsa", "Membuka casing alat", "Kalibrasi energi sendiri"], benar: 0, alasan: "Cek harian pengguna; kalibrasi/uji keselamatan listrik dilakukan elektromedis/lembaga penguji." },
    ],
  },
  {
    id: "infus", nama: "Infusion pump", adegan: "Ruang rawat inap · instruksi obat drip 20 mL/jam",
    langkah: [
      { tanya: "Sebelum memasang set infus ke pump…", pilihan: ["Pastikan set infus sesuai merek/tipe pump & bebas udara (priming)", "Isi sebagian saja", "Gunakan set apa pun"], benar: 0, alasan: "Set yang tidak kompatibel atau berudara memicu alarm oklusi/udara dan dosis tidak akurat." },
      { tanya: "Alarm OCCLUSION berbunyi. Tindakan pertama?", pilihan: ["Matikan alarm dan biarkan", "Periksa klem, selang tertekuk, dan jalur IV pasien", "Naikkan laju alir"], benar: 1, alasan: "Cari penyebab sumbatan di sepanjang jalur; menaikkan laju justru berbahaya." },
      { tanya: "Bila pump rusak/error berulang…", pilihan: ["Pakai terus sambil diawasi", "Tandai 'rusak', ganti pump, lalu Lapor Kerusakan di STARS", "Perbaiki sendiri"], benar: 1, alasan: "Alat bermasalah ditarik dari pemakaian dan dilaporkan agar ditangani elektromedis (SI-FARMALKES › Lapor Kerusakan)." },
    ],
  },
  {
    id: "ventilator", nama: "Ventilator", adegan: "ICU · pasien terintubasi, alarm tekanan tinggi",
    langkah: [
      { tanya: "Sebelum dipakai ke pasien, ventilator harus…", pilihan: ["Menjalani pre-use check / self-test sirkuit", "Langsung disambung ke pasien", "Diatur ke mode paling tinggi"], benar: 0, alasan: "Pre-use check memastikan kebocoran sirkuit, sensor aliran, dan O₂ berfungsi." },
      { tanya: "Alarm HIGH PRESSURE berbunyi. Kemungkinan penyebab?", pilihan: ["Sekret/selang tertekuk/pasien batuk–melawan", "Listrik padam", "Humidifier terlalu dingin"], benar: 0, alasan: "Tekanan tinggi umumnya karena hambatan jalan napas atau sirkuit." },
      { tanya: "Bila ventilator gagal total…", pilihan: ["Tunggu teknisi", "Ventilasi manual dengan bag-valve (Ambu) lalu ganti alat", "Matikan dan nyalakan berulang"], benar: 1, alasan: "Ventilasi pasien tidak boleh terputus; siapkan BVM di setiap bed ventilator." },
    ],
  },
];

export function SimulasiVr() {
  const [mid, setMid] = useState(MODUL[0].id);
  const m = MODUL.find((x) => x.id === mid)!;
  const [i, setI] = useState(0);
  const [jawab, setJawab] = useState<number[]>([]);
  const selesai = i >= m.langkah.length;
  const skor = jawab.filter((j, k) => j === m.langkah[k].benar).length;
  const pilihJawab = jawab[i];
  const ulang = (id = mid) => { setMid(id); setI(0); setJawab([]); };

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col" role="tablist" aria-label="Modul latihan">
        {MODUL.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === mid} onClick={() => ulang(x.id)}
            className={cn("whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors lg:whitespace-normal",
              x.id === mid ? "border-teal-500 bg-teal-50 text-navy-900" : "bg-white text-muted-foreground hover:bg-slate-50")}>{x.nama}</button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-[#2b1f6b] p-5 text-white">
        <div className="vr-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-teal-300">Skenario · {m.adegan}</p>
          <div className="mt-2 flex gap-1" aria-hidden>{m.langkah.map((_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full", k < i ? "bg-teal-400" : k === i ? "bg-white" : "bg-white/20")} />)}</div>
          {!selesai ? (
            <div className="mt-4">
              <p className="text-lg font-medium">Langkah {i + 1}/{m.langkah.length}: {m.langkah[i].tanya}</p>
              <div className="mt-3 grid gap-2">
                {m.langkah[i].pilihan.map((p, k) => {
                  const dipilih = pilihJawab === k, benar = k === m.langkah[i].benar;
                  return (
                    <button key={k} disabled={pilihJawab != null} onClick={() => setJawab((j) => { const n = [...j]; n[i] = k; return n; })}
                      className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm backdrop-blur transition-colors",
                        pilihJawab == null ? "border-white/20 bg-white/10 hover:bg-white/20" : benar ? "border-green-400 bg-green-500/20" : dipilih ? "border-red-400 bg-red-500/20" : "border-white/10 bg-white/5 opacity-60")}>
                      {pilihJawab != null && benar && <CheckCircle2 className="size-4 shrink-0 text-green-300" aria-hidden />}
                      {dipilih && !benar && <XCircle className="size-4 shrink-0 text-red-300" aria-hidden />}
                      {p}
                    </button>
                  );
                })}
              </div>
              {pilihJawab != null && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3" role="status">
                  <p className="max-w-xl text-sm text-white/85">{pilihJawab === m.langkah[i].benar ? "Tepat. " : "Kurang tepat. "}{m.langkah[i].alasan}</p>
                  <Button size="sm" variant="teal" onClick={() => setI(i + 1)}>{i + 1 < m.langkah.length ? "Langkah berikutnya" : "Lihat hasil"}</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 text-center" role="status">
              <p className="text-5xl font-semibold tabular-nums">{skor}/{m.langkah.length}</p>
              <p className="mt-2 text-white/85">{skor === m.langkah.length ? "Kompeten — semua langkah benar." : "Ulangi modul untuk mencapai skor penuh sebelum praktik di alat sebenarnya."}</p>
              <Button size="sm" variant="outline" className="mt-4 border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => ulang()}><RotateCcw /> Ulangi</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
