/**
 * Tampilan dokumen RKBU/RKPBU (dirender di dalam iframe agar CSS cetak terpisah dari aplikasi).
 * Halaman utama mengikuti orientasi pilihan (bawaan lanskap); halaman lampiran selalu tegak, 2 gambar per halaman
 * seperti template Dialog Kinerja.
 */
import { angkaRkbu, jumlahBaris, totalRkbu, ukuranKertas, urlGambarRkbu, volRkbu, type IsiRkbu } from "@/lib/rkbu";

/** Lebar kolom relatif (≈ mm pada A4 lanskap). Uraian paling lebar: di kertas kerja RS isinya bisa ribuan karakter. */
const LEBAR = [6, 22, 30, 54, 16, 14, 9, 10, 4, 9, 10, 20, 22, 11, 22];

export function gayaCetak(isi: IsiRkbu) {
  const u = ukuranKertas(isi.cetak);
  const tegak = ukuranKertas({ ...isi.cetak, orientasi: "portrait" });
  const tinggiLampiran = Math.max(60, Math.floor((tegak.tinggi - 24 - (isi.kop.tampil ? 40 : 10) - 12) / 2 - 10));
  const nomor = isi.cetak.nomorHalaman ? `@bottom-right { content: "Halaman " counter(page) " dari " counter(pages); font: 8pt Arial, sans-serif; color: #555; }` : "";
  return `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,"Liberation Sans",Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:${u.lebar}mm ${u.tinggi}mm;margin:10mm 10mm 12mm 10mm;${nomor}}
@page lampiran{size:${tegak.lebar}mm ${tegak.tinggi}mm;margin:12mm 15mm 12mm 18mm;${nomor}}
@media screen{
  body{background:#525659;padding:16px 0;zoom:var(--zoom,1)}
  .hal{width:${u.lebar}mm;min-height:${u.tinggi}mm;margin:0 auto 16px;background:#fff;padding:10mm 10mm 12mm 10mm;box-shadow:0 4px 24px rgba(0,0,0,.35)}
  .hal-lampiran{width:${tegak.lebar}mm;min-height:${tegak.tinggi}mm;padding:12mm 15mm 12mm 18mm}
  .rkbu tbody tr.dapat{cursor:pointer}
  .rkbu tbody tr.dapat:hover td{background:#fff8dc}
  .rkbu tbody tr.aktif td{background:#ffefb0}
}
@media print{
  .hal{padding:0;margin:0}
  .hal-lampiran{page:lampiran;break-before:page}
}
.kop{display:flex;align-items:flex-start;gap:12px}
.kop-logo{width:21mm;height:21mm;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.kop-logo img{max-width:100%;max-height:100%;object-fit:contain}
.kop-teks{flex:1;text-align:center;line-height:1.35}
.kop-gov{font-size:9pt;text-transform:uppercase}
.kop-rs{font-size:14pt;font-weight:700;line-height:1.15;margin:1px 0 2px}
.kop-baris{font-size:9pt}
.kop-kota{font-size:9pt;font-weight:700}
.kop-kode{font-size:9pt;text-align:right;margin-top:2px}
.kop-garis{border-bottom:1.5px solid #000;margin:2px 0 8px}
.kop-penyeimbang{width:21mm;flex-shrink:0}
.judul{text-align:center;font-weight:700;font-size:11pt;line-height:1.35;margin:4px 0 10px}
table.identitas{border-collapse:collapse;font-size:9pt;margin:0 0 8px}
table.identitas td{padding:1px 0;vertical-align:top}
table.identitas td.l{font-weight:700;white-space:nowrap;padding-right:14px}
table.rkbu{width:100%;border-collapse:collapse;font-size:${isi.cetak.huruf}pt;line-height:1.25}
.rkbu th,.rkbu td{border:0.75pt solid #000;padding:2px 3px;vertical-align:top}
.rkbu thead th{font-weight:700;text-align:center;vertical-align:middle;background:#fff}
.rkbu thead tr.nomor th{font-weight:400;font-style:italic;font-size:${Math.max(6, isi.cetak.huruf - 1)}pt;background:#f2f2f2;padding:1px 2px}
.rkbu td.num{text-align:right;white-space:nowrap}
.rkbu td.c{text-align:center}
.rkbu td.pre{white-space:pre-line}
.rkbu tbody tr{break-inside:${isi.cetak.barisUtuh ? "avoid" : "auto"}}
.rkbu td{orphans:3;widows:3}
.rkbu tr.total td{font-weight:700}
.rkbu tr.total td.tanpa{border:none}
.rkbu td.kosong{text-align:center;color:#888;font-style:italic;padding:8px}
.catatan{font-size:8pt;margin-top:5px}
.catatan p{margin:1px 0;white-space:pre-line}
.sah{margin-top:12px;font-size:9.5pt;break-inside:avoid}
.sah .pembuka{font-weight:700;margin-bottom:2px}
.sah .kolom{display:grid;gap:8mm;text-align:center}
.sah .kolom > div{display:flex;flex-direction:column}
.sah .tgl{min-height:1.3em}
.sah .jabatan{font-weight:700;white-space:pre-line;line-height:1.3}
.sah .ruang{flex:1;min-height:22mm}
.sah .nama{font-weight:700}
.sah .nip{font-weight:700}
.lampiran-judul{font-size:9pt;font-weight:700;margin:4px 0 10px}
.lamp{margin-bottom:6mm;break-inside:avoid}
.lamp h3{font-size:9pt;font-weight:600;margin:0 0 4px}
.lamp img{display:block;width:100%;height:${tinggiLampiran}mm;object-fit:contain;border:1px solid #ccc}
.lamp .belum{height:${tinggiLampiran}mm;border:1.5px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-style:italic;font-size:9pt}
`;
}

function Kop({ kop, penyeimbang = true }: { kop: IsiRkbu["kop"]; penyeimbang?: boolean }) {
  const logo = urlGambarRkbu(kop.logo);
  return (
    <>
      <div className="kop">
        {/* eslint-disable-next-line @next/next/no-img-element -- dokumen cetak di iframe */}
        {logo ? <div className="kop-logo"><img src={logo} alt="Logo" /></div> : null}
        <div className="kop-teks">
          {kop.pemerintah && <div className="kop-gov">{kop.pemerintah}</div>}
          {kop.nama && <div className="kop-rs">{kop.nama}</div>}
          {kop.alamat && <div className="kop-baris">{kop.alamat}</div>}
          {kop.kontak && <div className="kop-baris" style={{ whiteSpace: "pre-wrap" }}>{kop.kontak}</div>}
          {kop.kota && <div className="kop-kota">{kop.kota}</div>}
        </div>
        {logo && penyeimbang ? <div className="kop-penyeimbang" /> : null}
      </div>
      {kop.kodePos && <div className="kop-kode">{kop.kodePos}</div>}
      <div className="kop-garis" />
    </>
  );
}

/** "2.6.2002 Pemeliharaan Alat …" → kode di baris pertama, nama rekening di bawahnya (seperti kertas kerja). */
function Rekening({ teks }: { teks: string }) {
  const m = /^(\d+(?:\.\d+)+)\s+([\s\S]+)$/.exec(teks.trim());
  return m ? <>{m[1]}<br />{m[2]}</> : <>{teks}</>;
}

export function DokumenRkbu({ isi, aktif, onPilihBaris }: { isi: IsiRkbu; aktif?: string | null; onPilihBaris?: (id: string) => void }) {
  const k = isi.kolom;
  const total = totalRkbu(isi);
  const ttd = isi.pengesahan.ttd;
  const halLampiran: IsiRkbu["lampiran"][] = [];
  for (let i = 0; i < isi.lampiran.length; i += 2) halLampiran.push(isi.lampiran.slice(i, i + 2));
  const jumlahLebar = LEBAR.reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="hal hal-utama">
        {isi.kop.tampil && <Kop kop={isi.kop} />}
        <div className="judul">{isi.judul.filter((j) => j.trim()).map((j, i) => <div key={i}>{j}</div>)}</div>
        {isi.identitas.some((i) => i.label || i.nilai) && (
          <table className="identitas"><tbody>
            {isi.identitas.filter((i) => i.label || i.nilai).map((i, n) => <tr key={n}><td className="l">{i.label}</td><td>: {i.nilai}</td></tr>)}
          </tbody></table>
        )}
        <table className="rkbu">
          <colgroup>{LEBAR.map((l, i) => <col key={i} style={{ width: `${((l / jumlahLebar) * 100).toFixed(2)}%` }} />)}</colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>{k.no}</th><th rowSpan={2}>{k.rekening}</th><th rowSpan={2}>{k.barang}</th><th rowSpan={2}>{k.uraian}</th>
              <th rowSpan={2}>{k.lokasi}</th><th rowSpan={2}>{k.kodeBarang}</th><th colSpan={5}>{k.kelompokJumlah}</th><th colSpan={2}>{k.kelompokHarga}</th>
              <th rowSpan={2}>{k.prioritas}</th><th rowSpan={2}>{k.keterangan}</th>
            </tr>
            <tr><th>{k.vol1}</th><th>{k.satuan1}</th><th>{k.x}</th><th>{k.vol2}</th><th>{k.satuan2}</th><th>{k.harga}</th><th>{k.jumlah}</th></tr>
            <tr className="nomor">{LEBAR.map((_, i) => <th key={i}>{i + 1}</th>)}</tr>
          </thead>
          <tbody>
            {isi.baris.length === 0 && <tr><td className="kosong" colSpan={15}>Belum ada baris. Tambah baris atau ambil dari data Paket.</td></tr>}
            {isi.baris.map((b, i) => (
              <tr key={b.id} className={`${onPilihBaris ? "dapat" : ""}${aktif === b.id ? " aktif" : ""}`} onClick={onPilihBaris ? () => onPilihBaris(b.id) : undefined} data-baris={b.id}>
                <td className="c">{i + 1}</td>
                <td className="pre"><Rekening teks={b.rekening} /></td>
                <td className="pre">{b.barang}</td>
                <td className="pre">{b.uraian}</td>
                <td className="pre">{b.lokasi}</td>
                <td className="c">{b.kodeBarang}</td>
                <td className="num">{volRkbu(b.vol1)}</td>
                <td>{b.satuan1}</td>
                <td className="c">x</td>
                <td className="num">{volRkbu(b.vol2)}</td>
                <td>{b.satuan2}</td>
                <td className="num">{angkaRkbu(b.harga)}</td>
                <td className="num">{angkaRkbu(jumlahBaris(b, isi.ppn))}</td>
                <td className="c">{b.prioritas}</td>
                <td className="pre">{b.keterangan}</td>
              </tr>
            ))}
            <tr className="total">
              <td className="tanpa" colSpan={11} /><td className="num">GRAND TOTAL</td><td className="num">{angkaRkbu(total)}</td><td className="tanpa" colSpan={2} />
            </tr>
          </tbody>
        </table>
        {isi.catatan.some((c) => c.trim()) && <div className="catatan">{isi.catatan.filter((c) => c.trim()).map((c, i) => <p key={i}>{c}</p>)}</div>}
        {ttd.length > 0 && (
          <div className="sah">
            {isi.pengesahan.pembuka && <div className="pembuka">{isi.pengesahan.pembuka}</div>}
            <div className="kolom" style={{ gridTemplateColumns: `repeat(${ttd.length}, minmax(0, 1fr))` }}>
              {ttd.map((t, i) => (
                <div key={i}>
                  <div className="tgl">{i === ttd.length - 1 ? isi.pengesahan.tempatTanggal : ""}</div>
                  <div className="jabatan">{t.jabatan}</div>
                  <div className="ruang" />
                  <div className="nama">{t.nama || " "}</div>
                  {t.nip && <div className="nip">NIP. {t.nip}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {halLampiran.map((hal, h) => (
        <div key={h} className="hal hal-lampiran">
          {isi.kop.tampil && <Kop kop={isi.kop} penyeimbang={false} />}
          <div className="lampiran-judul">LAMPIRAN :</div>
          {hal.map((l, j) => {
            const src = urlGambarRkbu(l.gambar);
            return (
              <div key={l.id} className="lamp">
                <h3>{h * 2 + j + 1}. {l.judul || `Lampiran ${h * 2 + j + 1}`}</h3>
                {/* eslint-disable-next-line @next/next/no-img-element -- dokumen cetak di iframe */}
                {src ? <img src={src} alt={l.judul} /> : <div className="belum">Gambar belum diunggah</div>}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
