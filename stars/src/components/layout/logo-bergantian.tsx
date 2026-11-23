"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { LOGO_HEADER_BAWAAN, urlLogoRsud, type InfoSitus } from "@/lib/situs";
import { cn } from "@/lib/utils";

/** Logo STARS dan RS dalam satu posisi; mode, urutan, durasi, dan transisi diatur di CMS Situs. */
export function LogoBergantian({ info }: { info: InfoSitus }) {
  const atur = { ...LOGO_HEADER_BAWAAN, ...info.logoHeader };
  const urutan = atur.mode === "stars" ? ["stars"] : atur.mode === "rsud" ? ["rsud"] : atur.urutan === "rsud-stars" ? ["rsud", "stars"] : ["stars", "rsud"];
  const kunciUrutan = urutan.join();
  const [aktif, setAktif] = useState(0);
  const [tahan, setTahan] = useState(false);
  const [gerak, setGerak] = useState(true);

  useEffect(() => { setGerak(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => { setAktif(0); }, [kunciUrutan]);
  useEffect(() => {
    if (urutan.length < 2 || tahan || !gerak) return;
    const t = setInterval(() => setAktif((a) => (a + 1) % 2), atur.durasi * 1000);
    return () => clearInterval(t);
  }, [urutan.length, tahan, gerak, atur.durasi]);

  const tampil = urutan[Math.min(aktif, urutan.length - 1)];
  const kelas = (id: string) => cn(
    "col-start-1 row-start-1 flex items-center transition-all duration-700 ease-in-out motion-reduce:transition-none",
    tampil === id ? "translate-x-0 opacity-100" : cn("opacity-0", atur.transisi === "geser" ? "-translate-x-4" : "scale-95"),
  );

  return (
    <Link
      href="/"
      id="logo-header"
      data-tampil={tampil}
      aria-label="STARS dan RSUD Cipayung, ke Beranda"
      title="Ke Beranda"
      onMouseEnter={() => setTahan(true)}
      onMouseLeave={() => setTahan(false)}
      onFocus={() => setTahan(true)}
      onBlur={() => setTahan(false)}
      className="grid h-14 w-[7.5rem] shrink-0 overflow-hidden rounded-md text-navy-800 sm:w-[9.5rem] 2xl:w-[19rem]"
    >
      {urutan.includes("stars") && <span className={kelas("stars")} aria-hidden={tampil !== "stars"}><Logo subClassName="hidden 2xl:block 2xl:max-w-[15.5rem] 2xl:whitespace-nowrap" /></span>}
      {urutan.includes("rsud") && (
        <span className={kelas("rsud")} aria-hidden={tampil !== "rsud"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlLogoRsud(info)} alt="" className="h-9 w-auto max-w-full object-contain object-left sm:h-10" />
        </span>
      )}
    </Link>
  );
}
