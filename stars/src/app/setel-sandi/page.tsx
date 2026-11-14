import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BingkaiAkun } from "@/components/akun/bingkai-akun";
import { FormSetelSandi } from "@/components/akun/form-akun";
import { cekToken } from "@/lib/token-sandi";

export const metadata: Metadata = { title: "Buat sandi baru", referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function SetelSandiPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = String((await searchParams).token ?? "");
  const sah = await cekToken(token);
  return (
    <BingkaiAkun>
      {sah ? <FormSetelSandi token={token} /> : (
        <Card>
          <CardHeader>
            <CardTitle>Tautan tidak berlaku</CardTitle>
            <CardDescription>Tautan sudah dipakai, lewat 30 menit, atau tidak lengkap. Minta tautan baru.</CardDescription>
          </CardHeader>
          <CardContent><Button asChild className="w-full"><Link href="/lupa-sandi">Minta tautan baru</Link></Button></CardContent>
        </Card>
      )}
    </BingkaiAkun>
  );
}
