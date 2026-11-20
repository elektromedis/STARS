/** Konten bilah situs (CMS) — tipe & nilai bawaan. Aman dipakai di klien. */
export type TautanSitus = { label: string; labelEn?: string; href: string };
export type GrupTautan = { judul: string; judulEn?: string; tautan: TautanSitus[] };
export type InfoSitus = {
  alamat: string; telepon: string; whatsapp: string; email: string; peta: string;
  sosial: { facebook?: string; instagram?: string; x?: string; youtube?: string; tiktok?: string };
  aplikasiAndroid?: string; aplikasiIos?: string;
  grup: GrupTautan[];
  bantuanTeks: string;
  tampilBilahAtas: boolean;
};
export const INFO_BAWAAN: InfoSitus = {
  alamat: "Jl. Mini III, RT.4/RW.3, Bambu Apus, Kec. Cipayung, Jakarta Timur 13890",
  telepon: "", whatsapp: "", email: "", peta: "",
  sosial: {},
  grup: [
    { judul: "Untuk Pengunjung", judulEn: "For Visitors", tautan: [{ label: "Lapor Kerusakan Alat", labelEn: "Report Equipment Fault", href: "/lapor" }, { label: "Riwayat Laporan", labelEn: "Report History", href: "/riwayat" }, { label: "Pedoman STARS", labelEn: "STARS Guide", href: "/about/pedoman" }] },
    { judul: "Untuk Profesional", judulEn: "For Professionals", tautan: [{ label: "Kalender Pemeliharaan", labelEn: "Maintenance Calendar", href: "/kalender" }, { label: "Peminjaman Alat", labelEn: "Equipment Loan", href: "/peminjaman" }, { label: "Admin", labelEn: "Admin", href: "/admin" }] },
  ],
  bantuanTeks: "Bantuan?",
  tampilBilahAtas: true,
};
export type PengumumanPublik = { id: number; judul: string; gambar: string | null; tautan: string | null };
