export function Footer() {
  return (
    <footer className="border-t bg-card px-4 pb-24 pt-5 text-xs text-muted-foreground md:px-6 md:pb-24 print:pb-5">
      {/* pb-24 (ponsel): ruang agar teks tidak tertutup menu bawah; tablet/desktop memberi ruang untuk dock bawah */}
      <div className="mx-auto flex max-w-[1360px] flex-col gap-1 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit • RSUD Cipayung — Pemerintah Provinsi DKI Jakarta.</p>
        <p className="flex gap-3"><a href="/about/pedoman" className="underline hover:text-foreground">Pedoman</a><a href="/about" className="underline hover:text-foreground">Tentang</a></p>
      </div>
    </footer>
  );
}
