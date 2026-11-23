import type { Metadata } from "next";
import { ExternalLink, Wrench } from "lucide-react";
import { sesiHalaman } from "@/lib/sesi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "CMMS" };
export const dynamic = "force-dynamic";

function alamatCmms() {
  try {
    const u = new URL(process.env.TRILUX_URL ?? "");
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Pintu masuk CMMS. Aplikasinya berjalan terpisah dan memakai akun sendiri. */
export default async function Page() {
  await sesiHalaman("Viewer");
  const alamat = alamatCmms();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">CMMS</h1>
        <p className="text-sm text-muted-foreground">Sistem manajemen pemeliharaan dan aset alat kesehatan.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" aria-hidden /> Buka aplikasi CMMS</CardTitle>
          <CardDescription>CMMS terbuka di tab baru dan memakai akun CMMS, terpisah dari akun STARS.</CardDescription>
        </CardHeader>
        <CardContent>
          {alamat ? (
            <a id="buka-cmms" href={alamat} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md bg-navy-800 px-4 text-sm font-medium text-white hover:opacity-90">
              Buka CMMS <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : (
            <p role="status" className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">CMMS belum tersambung di server ini. Hubungi Admin STARS.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
