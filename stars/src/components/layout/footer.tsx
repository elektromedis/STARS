export function Footer() {
  return (
    <footer className="border-t bg-card px-4 pb-24 pt-5 text-xs text-muted-foreground md:px-6 md:pb-5 print:pb-5">
      {/* pb-24 (ponsel): ruang agar teks tidak tertutup menu bawah; tablet/desktop menu cepat pindah ke tepi kanan */}
      <div className="mx-auto flex max-w-[1360px] flex-col gap-1 sm:flex-row sm:justify-between">
        <p>© 2026 STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit • RSUD Cipayung.</p>
      </div>
    </footer>
  );
}
