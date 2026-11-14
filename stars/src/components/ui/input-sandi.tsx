"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Kolom sandi dengan tombol mata untuk menampilkan/menyembunyikan isian. */
export function InputSandi({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={lihat ? "text" : "password"} className={cn("pr-11", className)} />
      <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? "Sembunyikan sandi" : "Tampilkan sandi"} aria-pressed={lihat}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-navy-800 focus-visible:ring-2 focus-visible:ring-ring">
        {lihat ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
      </button>
    </div>
  );
}
