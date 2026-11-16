/**
 * Bantu WhatsApp tanpa layanan pihak ketiga: menormalkan nomor Indonesia ke format internasional (62…)
 * dan membuat tautan "klik untuk chat" (https://wa.me/<nomor>?text=…). Pesan dikirim oleh pengguna sendiri.
 */
export function normalWa(masukan: string | null | undefined): string | null {
  if (!masukan) return null;
  let d = masukan.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  else if (d.startsWith("8")) d = `62${d}`;
  // Indonesia: 62 + 8–13 digit (HP diawali 8). Negara lain: 10–15 digit.
  if (d.startsWith("62")) return /^62\d{8,13}$/.test(d) ? d : null;
  return /^\d{10,15}$/.test(d) ? d : null;
}

export const tautanWa = (nomor: string | null, teks: string) =>
  nomor ? `https://wa.me/${nomor}?text=${encodeURIComponent(teks)}` : `https://wa.me/?text=${encodeURIComponent(teks)}`;

export const tampilWa = (n: string) => (n.startsWith("62") ? `0${n.slice(2)}` : `+${n}`);
