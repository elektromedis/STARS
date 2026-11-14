import { SIKLUS, type IdTahap } from "@/lib/allies-siklus";

const PRE = "#14A0A8";
const POST = "#6250d6";
const C = 320;
const R = 210;

/**
 * Diagram siklus hidup alat (SVG statis + animasi CSS ringan): 10 tahap melingkar, Pre-Market (teal) lalu
 * Post-Market (ungu), panah kembali dari Penghapusan ke Analisa Kebutuhan. Titik bercahaya mengitari siklus;
 * tiap tahap berdenyut bergiliran. Angka di simpul = jumlah alat pada tahap itu. Animasi mati bila "kurangi gerakan".
 */
export function DiagramSiklus({ jumlah }: { jumlah: Record<IdTahap, number> }) {
  const n = SIKLUS.length;
  const titik = SIKLUS.map((t, i) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return { t, i, x: C + R * Math.cos(a), y: C + R * Math.sin(a), lx: C + (R + 62) * Math.cos(a), ly: C + (R + 62) * Math.sin(a), cos: Math.cos(a) };
  });
  const busur = (dari: number, ke: number) => {
    const a0 = (-90 + (360 / n) * dari) * (Math.PI / 180), a1 = (-90 + (360 / n) * ke) * (Math.PI / 180);
    return `M ${C + R * Math.cos(a0)} ${C + R * Math.sin(a0)} A ${R} ${R} 0 ${ke - dari > n / 2 ? 1 : 0} 1 ${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)}`;
  };
  return (
    <svg viewBox="-160 -20 960 680" className="h-auto w-full max-w-[760px]" role="img" aria-labelledby="judul-siklus">
      <title id="judul-siklus">{`Siklus alat kesehatan: ${SIKLUS.map((s) => `${s.no}. ${s.nama} (${jumlah[s.id]} alat)`).join(", ")}`}</title>
      <defs>
        <marker id="panah-siklus" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={POST} /></marker>
        <radialGradient id="pendar-siklus"><stop offset="0" stopColor="#5CD0D5" stopOpacity="0.35" /><stop offset="1" stopColor="#5CD0D5" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R + 30} fill="url(#pendar-siklus)" className="stars-pendar" />
      <path d={busur(0, 4)} fill="none" stroke={PRE} strokeWidth="10" strokeLinecap="round" opacity="0.85" />
      <path d={busur(5, 9)} fill="none" stroke={POST} strokeWidth="10" strokeLinecap="round" opacity="0.85" />
      <path d={busur(4, 5)} fill="none" stroke="#94a3b8" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
      <path d={busur(9, 10)} fill="none" stroke={POST} strokeWidth="4" strokeDasharray="10 8" markerEnd="url(#panah-siklus)" className="allies-alir" />

      {/* komet yang mengitari siklus */}
      <g className="allies-orbit">
        <circle cx={C} cy={C - R} r="9" fill="#fff" opacity="0.9" />
        <circle cx={C} cy={C - R} r="5" fill="#0B2545" />
      </g>

      {/* pusat */}
      <circle cx={C} cy={C} r="118" fill="#0B2545" />
      <text x={C} y={C - 30} textAnchor="middle" fill="#5CD0D5" fontSize="15" fontWeight="700" letterSpacing="3">SIKLUS ALAT</text>
      <text x={C} y={C + 14} textAnchor="middle" fill="#fff" fontSize="46" fontWeight="800" letterSpacing="4">ALLIES</text>
      <text x={C} y={C + 44} textAnchor="middle" fill="#A9C0DD" fontSize="14">Pre-Market → Post-Market</text>
      <text x={C} y={C + 64} textAnchor="middle" fill="#A9C0DD" fontSize="14">→ kembali ke kebutuhan</text>

      {titik.map(({ t, i, x, y, lx, ly, cos }) => {
        const warna = t.fase === "pre" ? PRE : POST;
        const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
        const kata = t.nama.split(" ");
        const baris = kata.length > 2 ? [kata.slice(0, Math.ceil(kata.length / 2)).join(" "), kata.slice(Math.ceil(kata.length / 2)).join(" ")] : [t.nama];
        return (
          <a key={t.id} href={`#tahap-${t.id}`} aria-label={`Tahap ${t.no}: ${t.nama}, ${jumlah[t.id]} alat`} className="group">
            <circle cx={x} cy={y} r="34" fill={warna} opacity="0.18" className="allies-denyut" style={{ animationDelay: `${i * 0.6}s` }} />
            <circle cx={x} cy={y} r="27" fill="#fff" stroke={warna} strokeWidth="4" className="transition-[stroke-width] group-hover:[stroke-width:7]" />
            <text x={x} y={y + 6} textAnchor="middle" fill="#0B2545" fontSize="18" fontWeight="800">{t.no}</text>
            {jumlah[t.id] > 0 && (
              <g>
                <rect x={x + 14} y={y - 34} width={Math.max(24, String(jumlah[t.id]).length * 9 + 12)} height="20" rx="10" fill={warna} />
                <text x={x + 14 + Math.max(24, String(jumlah[t.id]).length * 9 + 12) / 2} y={y - 20} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{jumlah[t.id]}</text>
              </g>
            )}
            <text x={lx} y={ly + (baris.length > 1 ? -4 : 5)} textAnchor={anchor} fill="#0B2545" fontSize="15" fontWeight="600" className="group-hover:fill-teal-700">
              {baris.map((b, k) => <tspan key={k} x={lx} dy={k ? 18 : 0}>{b}</tspan>)}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
