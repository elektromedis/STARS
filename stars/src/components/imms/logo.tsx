import { useId } from "react";

/** Logo EMASCARE: atom dengan inti palang medis. Elektron mengorbit (CSS offset-path, ringan; berhenti bila "kurangi gerakan"). */
const ORBIT = "M4,50 a46,17 0 1,0 92,0 a46,17 0 1,0 -92,0";
const SUDUT = [90, 30, 150];

export function LogoEmas({ ukuran = 34, className = "" }: { ukuran?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" width={ukuran} height={ukuran} className={`emas-logo ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" /><stop offset=".5" stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id={`i${id}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0891b2" />
        </radialGradient>
      </defs>
      {SUDUT.map((s, k) => (
        <g key={s} transform={`rotate(${s} 50 50)`}>
          <path d={ORBIT} fill="none" stroke={`url(#o${id})`} strokeWidth="4" strokeLinecap="round" opacity=".9" />
          <circle r="6" fill="#2dd4bf" stroke="#fff" strokeWidth="1.5" className="emas-elektron" style={{ offsetPath: `path("${ORBIT}")`, animationDuration: `${6 + k * 2}s`, animationDelay: `${-k * 1.7}s` }} />
        </g>
      ))}
      <circle cx="50" cy="50" r="15" fill={`url(#i${id})`} stroke={`url(#o${id})`} strokeWidth="3" className="emas-inti" />
      <path d="M46,40 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill="#fff" />
    </svg>
  );
}
