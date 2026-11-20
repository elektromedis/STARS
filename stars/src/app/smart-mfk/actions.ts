"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { audit } from "@/lib/audit";
import { mintaSinkronSmartMfk } from "@/lib/integrasi";

/** Tombol "Sinkron ke SMART MFK" (Operator+): SMART MFK langsung menarik alat, kalibrasi, perintah kerja, & status WR dari STARS. */
export async function sinkronSmartMfk() {
  const s = await auth();
  if (!s?.user || !cukup(s.user.peran, "Operator")) redirect("/login?callbackUrl=/smart-mfk");
  let pesan: string, ok: boolean;
  try {
    const r = await mintaSinkronSmartMfk();
    ok = r.berhasil; pesan = r.ringkasan;
  } catch (e) {
    ok = false; pesan = e instanceof Error ? e.message : String(e);
  }
  await audit("integrasi.sinkron", { email: s.user.email, objek: "SMART MFK", detail: `${ok ? "OK" : "GAGAL"}: ${pesan}`.slice(0, 500) });
  revalidatePath("/smart-mfk");
  redirect(`/smart-mfk?${ok ? "ok" : "galat"}=${encodeURIComponent(pesan.slice(0, 400))}`);
}
