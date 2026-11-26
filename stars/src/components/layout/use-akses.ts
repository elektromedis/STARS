"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { menuUntuk } from "@/lib/role-daftar";

let simpan: string[] | null = null;
const pendengar = new Set<(t: string[]) => void>();
let muat: Promise<void> | null = null;

function ambil() {
  muat ??= fetch("/api/akses-saya", { cache: "no-store" }).then((r) => r.json()).then((j: { tutup?: string[] }) => { simpan = j.tutup ?? []; pendengar.forEach((f) => f(simpan!)); }).catch(() => { simpan = []; }).finally(() => { setTimeout(() => { muat = null; }, 30_000); });
  return muat;
}

/** Daftar href menu yang dimatikan untuk peran pengguna (kosong bila tamu / tanpa batasan). */
export function useMenuTertutup() {
  const [tutup, setTutup] = useState<string[]>(simpan ?? []);
  useEffect(() => { pendengar.add(setTutup); ambil(); return () => { pendengar.delete(setTutup); }; }, []);
  return tutup;
}

export const menuTertutup = (tutup: string[], href: string) => { const h = menuUntuk(href); return Boolean(h && tutup.includes(h)); };

/** Penjaga: bila halaman sekarang dimatikan untuk peran pengguna, alihkan ke Dashboard. */
export function PenjagaAkses() {
  const tutup = useMenuTertutup();
  const path = usePathname() ?? "/";
  const router = useRouter();
  useEffect(() => { if (tutup.length && menuTertutup(tutup, path)) router.replace("/?ditolak=" + encodeURIComponent("menu ini (dimatikan untuk peran Anda)")); }, [tutup, path, router]);
  return null;
}
