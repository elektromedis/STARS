"use client";

import { cn } from "@/lib/utils";

export type ModeRobot = "diam" | "email" | "sandi" | "intip" | "salah" | "proses";

/** Robot ALLIES pada login: mengikuti ketikan email, menutup mata saat sandi, mengintip saat sandi ditampilkan. */
export function RobotLogin({ mode, arah }: { mode: ModeRobot; arah: number }) {
  const tutup = mode === "sandi" || mode === "intip";
  const x = mode === "email" ? -7 + 14 * arah : 0;
  const y = mode === "email" ? 3 : mode === "proses" ? -3 : 0;
  const halus = "transition-transform duration-300 ease-out motion-reduce:transition-none";
  return (
    <div id="robot-login" data-mode={mode} className={cn("mx-auto size-32 overflow-hidden rounded-full bg-gradient-to-b from-sky-100 to-teal-100 ring-4 ring-white shadow-md", mode === "salah" && "robot-geleng")}>
      <svg viewBox="0 0 160 160" className="size-full" role="img" aria-label="Robot ALLIES">
        <path d="M80 18V8" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
        <circle cx="80" cy="7" r="5" fill={mode === "salah" ? "#ef4444" : "#14b8a6"} className={mode === "proses" ? "animate-pulse" : ""} />
        <path d="M34 168c2-34 20-50 46-50s44 16 46 50Z" fill="#475569" />
        <circle cx="80" cy="140" r="6" fill="#2dd4bf" />
        <rect x="70" y="102" width="20" height="18" rx="6" fill="#334155" />
        <rect x="27" y="52" width="10" height="26" rx="5" fill="#94a3b8" /><rect x="123" y="52" width="10" height="26" rx="5" fill="#94a3b8" />
        <rect x="34" y="18" width="92" height="90" rx="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <rect x="46" y="42" width="68" height="36" rx="18" fill="#0b1220" />
        <g className={halus} style={{ transform: `translate(${x}px, ${y}px)` }}>
          {mode === "salah" ? (
            <path d="M58 56l8 8m0-8-8 8M94 56l8 8m0-8-8 8" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
          ) : (
            <g className="robot-kedip" fill="#2dd4bf"><circle cx="63" cy="60" r="7" /><circle cx="97" cy="60" r="7" /></g>
          )}
        </g>
        <path d={mode === "salah" ? "M70 94q10-7 20 0" : "M70 90q10 7 20 0"} fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <g fill="#64748b" stroke="#e2e8f0" strokeWidth="2">
          <g className={halus} style={{ transform: tutup ? "translate(0, -92px)" : "translate(0, 0)" }}><rect x="40" y="148" width="42" height="34" rx="15" /></g>
          <g className={halus} style={{ transform: mode === "sandi" ? "translate(0, -92px)" : mode === "intip" ? "translate(8px, -58px)" : "translate(0, 0)" }}><rect x="78" y="148" width="42" height="34" rx="15" /></g>
        </g>
      </svg>
    </div>
  );
}
