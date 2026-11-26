/** Pembantu kecil untuk server action halaman admin Fase A–E (pola sama dengan admin/lembar-kerja). */
import { redirect } from "next/navigation";

export const s = (fd: FormData, k: string, n = 300) => String(fd.get(k) ?? "").trim().slice(0, n);
export const pesan = (url: string, k: "ok" | "error", t: string): never => redirect(`${url}${url.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(t)}`);
export const modeBaca = () => process.env.STARS_MODE === "internet";
export const pesanZod = (e: { issues: { message: string }[] }) => [...new Set(e.issues.map((i) => i.message))].join("; ");
export const tglWib = (v: string) => (v ? new Date(`${v}T08:00:00+07:00`) : null);
export const inputTgl = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const tgl = (d: Date | null | undefined) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" }) : "—");
export const rp = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n));
export const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
