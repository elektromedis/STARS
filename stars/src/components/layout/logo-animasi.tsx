import { cn } from "@/lib/utils";

const TEAL = "#1CC8B5";
const BIRU = "#2B6FCA";

/**
 * Gambar ikon STARS (cincin + monitor EKG) dalam koordinat 0..400 × 0..420.
 * Animasi CSS ringan di globals.css (hanya transform, opacity, stroke-dashoffset — tanpa JavaScript),
 * otomatis mati bila pengguna memilih "kurangi gerakan".
 */
function IkonStars({ putih = false }: { putih?: boolean }) {
  const [T, B, G] = putih ? ["#FFFFFF", "#FFFFFF", "#0F766E"] : [TEAL, BIRU, "#0B1A2E"];
  return (
    <>
      {/* pendar lembut di belakang ikon */}
      <circle className="stars-pendar" cx="200" cy="210" r="150" fill={T} opacity={putih ? 0 : 0.12} />
      {/* cincin: empat busur berselang warna + simpul, berputar pelan */}
      <g className="stars-cincin" fill="none" strokeWidth="26" strokeLinecap="round">
        <path d="M 35 210 A 165 165 0 0 1 200 45" stroke={T} />
        <path d="M 200 45 A 165 165 0 0 1 365 210" stroke={B} />
        <path d="M 365 210 A 165 165 0 0 1 200 375" stroke={T} />
        <path d="M 200 375 A 165 165 0 0 1 35 210" stroke={B} />
        <circle cx="200" cy="45" r="25" fill={T} />
        <circle cx="365" cy="210" r="25" fill={B} />
        <circle cx="200" cy="375" r="25" fill={T} />
        <circle cx="35" cy="210" r="25" fill={B} />
      </g>
      {/* monitor + garis EKG */}
      <rect x="100" y="155" width="200" height="110" rx="22" fill={T} />
      <g fill="none" stroke={G} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        <path opacity="0.3" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
        <path className="stars-ekg" d="M 96 210 L 152 210 L 164 203 L 176 226 L 196 158 L 218 248 L 240 192 L 256 210 L 300 210" />
      </g>
      <g fill={B}>
        {[186, 210, 234].map((cy, i) => <circle key={cy} className="stars-titik" style={{ animationDelay: `${i * 0.2}s` }} cx="324" cy={cy} r="8" />)}
      </g>
    </>
  );
}

/** Ikon STARS saja (sidebar, header ponsel): transparan, tajam di ukuran berapa pun. */
export function LogoIkon({ className, putih }: { className?: string; putih?: boolean }) {
  return (
    <svg viewBox="0 0 400 420" className={cn("shrink-0", className)} role="img" aria-label="Logo STARS">
      <IkonStars putih={putih} />
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

/**
 * Logo STARS tegak (ikon di tengah atas, nama di bawah, semua rata tengah) — untuk panel pembuka beranda.
 * Sama-sama beranimasi (cincin berputar, EKG berjalan) lewat kelas CSS yang sama.
 */
export function LogoTegak({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 700 690" className={cn("stars-logo h-auto font-sans", className)} role="img" aria-labelledby="stars-logo-tegak">
      <title id="stars-logo-tegak">STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit</title>
      <g transform="translate(150 0)"><IkonStars /></g>
      <text x="350" y="548" textAnchor="middle" fill="#0B2545" fontSize="118" fontWeight="800" letterSpacing="10">STARS</text>
      <rect x="312" y="574" width="76" height="9" rx="4.5" fill={TEAL} />
      <text x="350" y="630" textAnchor="middle" fill="#25507F" fontSize="27" fontWeight="500">Sistem Terintegrasi Alat Kesehatan Rumah Sakit</text>
      <text x="350" y="676" textAnchor="middle" fill="#0E8089" fontSize="19" fontWeight="700" letterSpacing="5">MONITOR • ANALYZE • CONNECT</text>
    </svg>
  );
}
