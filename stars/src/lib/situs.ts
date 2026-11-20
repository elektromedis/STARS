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
  /** Etalase & kaki halaman */
  /** Nama berkas logo RS unggahan CMS (kosong = /logo-rsud.png). */
  logoRsud?: string;
  /** Menu "Aplikasi" di header (dropdown). */
  aplikasi?: TautanSitus[];
  visi?: string; visiEn?: string;
  subAkreditasi?: string; subMitra?: string;
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
  aplikasi: ["NPiS", "Plasing", "aFiles+", "Com Based-Test", "aPortal+", "aStun+"].map((label) => ({ label, href: "https://rsudcipayung.jakarta.go.id/rsudcipayung/index.php" })),
  visi: "Alat kesehatan aman, laik pakai, dan siap melayani", visiEn: "Safe, fit-for-use medical devices, ready to serve",
  subAkreditasi: "Komitmen kami terhadap mutu dan keselamatan pasien.",
  subMitra: "Kami berkolaborasi dengan berbagai pihak untuk layanan alat kesehatan yang aman dan andal.",
};
export type PengumumanPublik = { id: number; judul: string; gambar: string | null; tautan: string | null };
export const urlLogoRsud = (i: { logoRsud?: string }) => (i.logoRsud ? `/api/situs/gambar/${i.logoRsud}` : "/logo-rsud.png");
export type ItemSitusPublik = { id: number; jenis: string; judul: string; judulEn: string | null; gambar: string | null; tautan: string | null };
