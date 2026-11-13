"use client";

import { useEffect, useState } from "react";
import { Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusLokal, laporanSaya, PERISTIWA_LOKAL, riwayatScan } from "@/lib/lokal";

/** Riwayat laporan & scan disimpan di browser perangkat ini (tanpa akun). */
export function PengaturanPerangkat() {
  const [jumlah, setJumlah] = useState<{ laporan: number; scan: number } | null>(null);
  useEffect(() => {
    const baca = () => setJumlah({ laporan: laporanSaya().length, scan: riwayatScan().length });
    baca();
    window.addEventListener(PERISTIWA_LOKAL, baca);
    return () => window.removeEventListener(PERISTIWA_LOKAL, baca);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="size-4 text-teal-700" /> Data di perangkat ini</CardTitle>
        <CardDescription>Riwayat laporan (untuk melacak status) dan alat yang dipindai hanya tersimpan di browser ini, bukan di akun.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{jumlah ? `${jumlah.laporan} laporan · ${jumlah.scan} alat dipindai` : "…"}</p>
        <Button type="button" variant="outline" size="sm" disabled={!jumlah || (jumlah.laporan + jumlah.scan === 0)}
          onClick={() => { if (window.confirm("Hapus riwayat laporan & scan di perangkat ini? Laporan tetap tersimpan di server.")) { hapusLokal("laporan"); hapusLokal("scan"); } }}>
          <Trash2 /> Hapus riwayat perangkat
        </Button>
      </CardContent>
    </Card>
  );
}
