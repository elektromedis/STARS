/** Simpan laporan kerusakan dari publik (tanpa akun) beserta foto/video opsional. Server saja. */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { audit } from "./audit";
import { batasi } from "./rate-limit";
import { nomorBerikut, skemaPermintaan } from "./pemeliharaan";
import { MAKS_FOTO_LAPOR, MAKS_VIDEO_LAPOR } from "./lapor-media";

export const folderPermintaan = () => join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "permintaan");

type Gagal = { error: string; status: number };

/** Kenali foto dari isinya: JPG/PNG/WEBP. */
function extFoto(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

/** Kenali video dari isinya: MP4/MOV (kotak "ftyp") atau WEBM (EBML). */
function extVideo(buf: Buffer): string | null {
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") return buf.subarray(8, 12).toString("latin1") === "qt  " ? "mov" : "mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  return null;
}

async function periksa(berkas: FormDataEntryValue | null, jenis: "foto" | "video"): Promise<{ buf: Buffer; ext: string } | null | Gagal> {
  if (!(berkas instanceof File) || berkas.size === 0) return null;
  const maks = jenis === "foto" ? MAKS_FOTO_LAPOR : MAKS_VIDEO_LAPOR;
  if (berkas.size > maks) return { error: jenis === "foto" ? "Ukuran foto melebihi 5 MB." : "Ukuran video melebihi 20 MB. Rekam lebih singkat (±10–20 detik) atau pilih resolusi lebih rendah.", status: 413 };
  const buf = Buffer.from(await berkas.arrayBuffer());
  const ext = jenis === "foto" ? extFoto(buf) : extVideo(buf);
  if (!ext) return { error: jenis === "foto" ? "Foto harus berformat JPG, PNG, atau WEBP." : "Video harus berformat MP4, MOV, atau WEBM.", status: 400 };
  return { buf, ext };
}

const gagal = (v: unknown): v is Gagal => typeof v === "object" && v !== null && "error" in v;

export async function simpanLaporan(fd: FormData, ip: string | null): Promise<{ nomor: string; kodeLacak: string } | Gagal> {
  if (process.env.STARS_MODE === "internet") return { error: "Server ini baca saja. Silakan lapor dari jaringan RS atau hubungi IPSRS/Elektromedik.", status: 403 };
  const batas = batasi(`lapor:${ip ?? "lokal"}`, 10, 30 * 60 * 1000);
  if (!batas.boleh) return { error: `Terlalu banyak laporan dari perangkat ini. Coba lagi dalam ${Math.ceil(batas.sisaDetik / 60)} menit, atau hubungi petugas langsung.`, status: 429 };

  const parsed = skemaPermintaan.safeParse({
    namaAlat: fd.get("namaAlat"), alatId: fd.get("alatId") || null, unitKerjaId: fd.get("unitKerjaId") || null,
    lokasi: fd.get("lokasi") || undefined, pelapor: fd.get("pelapor"), kontak: fd.get("kontak") || undefined,
    keluhan: fd.get("keluhan"), prioritas: fd.get("prioritas") || "Normal",
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; "), status: 400 };
  const d = parsed.data;
  if (d.unitKerjaId && !(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId }, select: { id: true } }))) return { error: "Unit kerja tidak dikenal.", status: 400 };
  if (d.alatId && !(await prisma.alat.findUnique({ where: { id: d.alatId }, select: { id: true } }))) return { error: "Alat tidak dikenal.", status: 400 };

  const foto = await periksa(fd.get("foto"), "foto");
  if (gagal(foto)) return foto;
  const video = await periksa(fd.get("video"), "video");
  if (gagal(video)) return video;

  const tersimpan: string[] = [];
  const simpan = async (b: { buf: Buffer; ext: string } | null) => {
    if (!b) return null;
    await mkdir(folderPermintaan(), { recursive: true });
    const nama = `${randomUUID()}.${b.ext}`;
    await writeFile(join(folderPermintaan(), nama), b.buf);
    tersimpan.push(nama);
    return nama;
  };

  try {
    const namaFoto = await simpan(foto);
    const namaVideo = await simpan(video);
    const kodeLacak = randomBytes(9).toString("base64url");
    const nomor = await nomorBerikut("WR");
    await prisma.permintaanKerja.create({
      data: {
        nomor, namaAlat: d.namaAlat, alatId: d.alatId ?? null, unitKerjaId: d.unitKerjaId ?? null,
        lokasi: d.lokasi || null, pelapor: d.pelapor, kontak: d.kontak || null, keluhan: d.keluhan,
        prioritas: d.prioritas, foto: namaFoto, video: namaVideo, kodeLacak, status: "Baru",
      },
    });
    await audit("permintaan.buat", { email: null, ip, objek: nomor, detail: `${d.namaAlat} — ${d.prioritas}${namaFoto ? " +foto" : ""}${namaVideo ? " +video" : ""}` });
    return { nomor, kodeLacak };
  } catch (err) {
    await Promise.all(tersimpan.map((n) => unlink(join(folderPermintaan(), n)).catch(() => {})));
    return { error: `Gagal menyimpan laporan: ${err instanceof Error ? err.message : String(err)}`, status: 500 };
  }
}
