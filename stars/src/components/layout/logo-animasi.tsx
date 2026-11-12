import { cn } from "@/lib/utils";

/**
 * Logo STARS vektor (SVG) untuk latar gelap: tanpa kotak putih, tajam di resolusi berapa pun.
 * Animasi CSS ringan di globals.css (hanya transform, opacity, stroke-dashoffset — tanpa JavaScript),
 * otomatis mati bila pengguna memilih "kurangi gerakan".
 */
export function LogoAnimasi({ className }: { className?: string }) {
  const teal = "#1CC8B5";
  const biru = "#2B6FCA";
  return (
    <svg viewBox="0 0 1260 420" className={cn("stars-logo h-auto font-sans", className)} role="img" aria-labelledby="stars-logo-judul">
      <title id="stars-logo-judul">STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit</title>

      {/* pendar lembut di belakang ikon */}
      <circle className="stars-pendar" cx="200" cy="210" r="150" fill={teal} opacity="0.12" />

      {/* cincin: empat busur berselang warna + simpul, berputar pelan */}
      <g className="stars-cincin" fill="none" strokeWidth="26" strokeLinecap="round">
        <path d="M 35 210 A 165 165 0 0 1 200 45" stroke={teal} />
        <path d="M 200 45 A 165 165 0 0 1 365 210" stroke={biru} />
        <path d="M 365 210 A 165 165 0 0 1 200 375" stroke={teal} />
        <path d="M 200 375 A 165 165 0 0 1 35 210" stroke={biru} />
        <circle cx="200" cy="45" r="25" fill={teal} />
        <circle cx="365" cy="210" r="25" fill={biru} />
        <circle cx="200" cy="375" r="25" fill={teal} />
        <circle cx="35" cy="210" r="25" fill={biru} />
      </g>

      {/* monitor + garis EKG */}
      <rect x="100" y="155" width="200" height="110" rx="22" fill={teal} />
      <g fill="none" stroke="#0B1A2E" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        <path opacity="0.3" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
        <path className="stars-ekg" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
      </g>
      <g fill={biru}>
        {[186, 210, 234].map((cy, i) => <circle key={cy} className="stars-titik" style={{ animationDelay: `${i * 0.2}s` }} cx="324" cy={cy} r="8" />)}
      </g>

      {/* tulisan */}
      <text x="468" y="236" fill="#FFFFFF" fontSize="124" fontWeight="800" letterSpacing="6">STARS</text>
      <rect x="474" y="266" width="76" height="9" rx="4.5" fill={teal} />
      <text x="470" y="330" fill="#D6E2F0" fontSize="33" fontWeight="500">Sistem Terintegrasi Alat Kesehatan Rumah Sakit</text>
      <text x="472" y="386" fill="#5CD0D5" fontSize="19" fontWeight="700" letterSpacing="4.5">MONITOR • ANALYZE • CONNECT</text>
    </svg>
  );
}
