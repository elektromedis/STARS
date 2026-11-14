/** Dipasang ulang tiap pindah halaman → animasi masuk halaman (lihat .halaman-masuk di globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="halaman-masuk">{children}</div>;
}
