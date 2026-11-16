"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Muat ulang data halaman tiap `detik` selama tab terlihat; menampilkan jam pembaruan terakhir (WIB). */
export function SegarkanOtomatis({ detik = 20, waktuServer }: { detik?: number; waktuServer: string }) {
  const router = useRouter();
  const [sibuk, mulai] = useTransition();
  const [, setDetak] = useState(0);
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const segar = () => mulai(() => router.refresh());
    const jalan = () => { clearInterval(t); if (document.visibilityState === "visible") t = setInterval(segar, detik * 1000); };
    const lihat = () => { if (document.visibilityState === "visible") segar(); jalan(); };
    jalan();
    document.addEventListener("visibilitychange", lihat);
    const jam = setInterval(() => setDetak((x) => x + 1), 1000);
    return () => { clearInterval(t); clearInterval(jam); document.removeEventListener("visibilitychange", lihat); };
  }, [detik, router]);
  const jam = new Date(waktuServer).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-900">
      <span className="sinkron-denyut size-2 rounded-full bg-green-600" aria-hidden />
      Live · diperbarui {jam} WIB
      <RefreshCw className={`size-3 ${sibuk ? "animate-spin" : ""}`} aria-hidden />
    </span>
  );
}
