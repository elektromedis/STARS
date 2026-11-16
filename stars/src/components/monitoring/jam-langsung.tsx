"use client";

import { useEffect, useState } from "react";

/** Jam WIB yang berdetik (HH:MM), untuk bilah status SI-LOGGER. */
export function JamLangsung({ awal }: { awal: string }) {
  const [t, setT] = useState(() => Date.parse(awal));
  useEffect(() => { setT(Date.now()); const id = setInterval(() => setT(Date.now()), 10_000); return () => clearInterval(id); }, []);
  return <time className="text-2xl font-medium tabular-nums" suppressHydrationWarning>{new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(".", ":")}</time>;
}
