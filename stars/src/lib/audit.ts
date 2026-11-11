import { prisma } from "./prisma";

/** Mencatat kejadian ke AuditLog. Tidak pernah melempar error agar tidak mengganggu alur utama. */
export async function audit(aksi: string, data: { email?: string | null; objek?: string | null; detail?: string | null; ip?: string | null } = {}) {
  try {
    await prisma.auditLog.create({ data: { aksi, email: data.email ?? null, objek: data.objek ?? null, detail: data.detail ?? null, ip: data.ip ?? null } });
  } catch (e) {
    console.error("[audit] gagal mencatat:", aksi, e);
  }
}

export function ipDari(headers: Headers) {
  return (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || null;
}
