/**
 * Pembatas percobaan sederhana di memori (per proses): maks `maks` kejadian per `jendelaMs` untuk satu kunci (mis. IP).
 * Cukup untuk satu instance; bila nanti berjalan multi-instance, pindahkan ke Redis.
 */
const ember = new Map<string, { hitung: number; mulai: number }>();

export function batasi(kunci: string, maks = 5, jendelaMs = 15 * 60 * 1000): { boleh: boolean; sisaDetik: number } {
  const kini = Date.now();
  const e = ember.get(kunci);
  if (!e || kini - e.mulai > jendelaMs) {
    ember.set(kunci, { hitung: 1, mulai: kini });
    return { boleh: true, sisaDetik: 0 };
  }
  e.hitung += 1;
  if (e.hitung > maks) return { boleh: false, sisaDetik: Math.ceil((e.mulai + jendelaMs - kini) / 1000) };
  return { boleh: true, sisaDetik: 0 };
}

export function reset(kunci: string) {
  ember.delete(kunci);
}

// bersihkan entri lama tiap 10 menit agar memori tidak membengkak
if (typeof setInterval === "function") {
  const t = setInterval(() => {
    const kini = Date.now();
    for (const [k, v] of ember) if (kini - v.mulai > 60 * 60 * 1000) ember.delete(k);
  }, 10 * 60 * 1000);
  if (typeof t === "object" && t && "unref" in t) (t as { unref: () => void }).unref();
}
