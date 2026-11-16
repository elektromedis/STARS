"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Panel simulasi SI-LOGGER: isi/hapus data demo dan kirim bacaan langsung tiap menit selama halaman terbuka. */
export function TombolDemo({ adaDemo }: { adaDemo: boolean }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [langsung, setLangsung] = useState(false);
  const jalan = useRef(false);

  async function kirim(aksi: "isi" | "hapus", diam = false) {
    if (jalan.current) return;
    jalan.current = true; if (!diam) setSibuk(true);
    try {
      const r = await fetch("/api/admin/monitoring/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aksi, diam }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: string; error?: string };
      if (!diam || !r.ok) setPesan(j.ok ?? j.error ?? "Gagal.");
      router.refresh();
    } catch { setPesan("Tidak dapat menghubungi server."); }
    finally { jalan.current = false; setSibuk(false); }
  }

  useEffect(() => {
    if (!langsung) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") void kirim("isi", true); }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langsung]);

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
      <p className="flex items-center gap-2 font-semibold text-navy-800"><FlaskConical className="size-4 text-amber-600" aria-hidden /> Mode demo (tanpa perangkat IoT)</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Membuat 4 lokasi contoh (kulkas vaksin, kulkas darah, freezer, ruang alat) berkode <strong>DEMO-</strong> dengan riwayat 7 hari dan beberapa alarm, agar tampilan SI-LOGGER bisa dicoba. Data asli tidak tersentuh.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => kirim("isi")} disabled={sibuk}><FlaskConical /> {adaDemo ? "Perbarui data demo" : "Isi data demo"}</Button>
        {adaDemo && (
          <Button size="sm" variant="outline" onClick={() => setLangsung((x) => !x)} aria-pressed={langsung}>
            {langsung ? <><Square /> Hentikan simulasi langsung</> : <><Play /> Simulasi langsung (bacaan tiap 1 menit)</>}
          </Button>
        )}
        {adaDemo && <Button size="sm" variant="outline" onClick={() => { if (confirm("Hapus semua lokasi & sensor DEMO- beserta bacaannya?")) { setLangsung(false); void kirim("hapus"); } }} disabled={sibuk}><Trash2 /> Hapus data demo</Button>}
      </div>
      {langsung && <p className="mt-2 text-xs text-amber-800">Simulasi langsung aktif selama halaman ini terbuka.</p>}
      {pesan && <p className="mt-2 text-sm text-navy-800" role="status">{pesan}</p>}
    </div>
  );
}
