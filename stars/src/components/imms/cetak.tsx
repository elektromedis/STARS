"use client";
export function TombolCetak({ label = "Cetak / PDF" }: { label?: string }) {
  return <button type="button" className="kapsul cetak-sembunyi" onClick={() => window.print()}>{label}</button>;
}
