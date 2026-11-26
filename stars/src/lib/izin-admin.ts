/** Penjaga aksi admin Fase A–E: tolak di mode internet (baca saja) dan bila sakelar izin peran (User System) OFF. */
import { bolehAksi } from "./role";
import type { KodeAksi } from "./role-daftar";
import { pesan, modeBaca } from "./aksi-admin";

export async function izin(se: { user: { id?: string | null } }, aksi: KodeAksi, url: string) {
  if (modeBaca()) pesan(url, "error", "Server mode internet bersifat baca saja.");
  if (!(await bolehAksi(se.user.id, aksi))) pesan(url, "error", "Peran Anda tidak diizinkan untuk aksi ini (atur di Admin → CMS Pengguna → User System).");
}
