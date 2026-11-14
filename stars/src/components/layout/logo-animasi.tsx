import { cn } from "@/lib/utils";

const TEAL = "#1CC8B5";
const BIRU = "#2B6FCA";

/**
 * Gambar ikon STARS (cincin + monitor EKG) dalam koordinat 0..400 × 0..420.
 * Animasi CSS ringan di globals.css (hanya transform, opacity, stroke-dashoffset — tanpa JavaScript),
 * otomatis mati bila pengguna memilih "kurangi gerakan".
 */
function IkonStars() {
  return (
    <>
      {/* pendar lembut di belakang ikon */}
      <circle className="stars-pendar" cx="200" cy="210" r="150" fill={TEAL} opacity="0.12" />
      {/* cincin: empat busur berselang warna + simpul, berputar pelan */}
      <g className="stars-cincin" fill="none" strokeWidth="26" strokeLinecap="round">
        <path d="M 35 210 A 165 165 0 0 1 200 45" stroke={TEAL} />
        <path d="M 200 45 A 165 165 0 0 1 365 210" stroke={BIRU} />
        <path d="M 365 210 A 165 165 0 0 1 200 375" stroke={TEAL} />
        <path d="M 200 375 A 165 165 0 0 1 35 210" stroke={BIRU} />
        <circle cx="200" cy="45" r="25" fill={TEAL} />
        <circle cx="365" cy="210" r="25" fill={BIRU} />
        <circle cx="200" cy="375" r="25" fill={TEAL} />
        <circle cx="35" cy="210" r="25" fill={BIRU} />
      </g>
      {/* monitor + garis EKG */}
      <rect x="100" y="155" width="200" height="110" rx="22" fill={TEAL} />
      <g fill="none" stroke="#0B1A2E" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        <path opacity="0.3" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
        <path className="stars-ekg" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
      </g>
      <g fill={BIRU}>
        {[186, 210, 234].map((cy, i) => <circle key={cy} className="stars-titik" style={{ animationDelay: `${i * 0.2}s` }} cx="324" cy={cy} r="8" />)}
      </g>
    </>
  );
}

/** Ikon STARS saja (sidebar, header ponsel): transparan, tajam di ukuran berapa pun. */
export function LogoIkon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 420" className={cn("shrink-0", className)} role="img" aria-label="Logo STARS">
      <IkonStars />
    </svg>
  );
}

/**
 * Logo STARS lengkap beranimasi: ikon + nama sistem, tanpa kotak putih.
 * Bawaan untuk latar gelap (hero dashboard); `terang` = teks navy untuk latar putih (halaman Masuk/Daftar).
 */
export function LogoAnimasi({ className, terang = false }: { className?: string; terang?: boolean }) {
  const [judul, sub, slogan] = terang ? ["#0B2545", "#25507F", "#0E8089"] : ["#FFFFFF", "#D6E2F0", "#5CD0D5"];
  return (
    <svg viewBox="0 0 1260 420" className={cn("stars-logo h-auto font-sans", className)} role="img" aria-labelledby="stars-logo-judul">
      <title id="stars-logo-judul">STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit</title>
      <IkonStars />
      <text x="468" y="236" fill={judul} fontSize="124" fontWeight="800" letterSpacing="6">STARS</text>
      <rect x="474" y="266" width="76" height="9" rx="4.5" fill={TEAL} />
      <text x="470" y="330" fill={sub} fontSize="33" fontWeight="500">Sistem Terintegrasi Alat Kesehatan Rumah Sakit</text>
      <text x="472" y="386" fill={slogan} fontSize="19" fontWeight="700" letterSpacing="4.5">MONITOR • ANALYZE • CONNECT</text>
    </svg>
  );
}
