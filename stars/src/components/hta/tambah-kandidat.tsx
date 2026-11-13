"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorProduk, produkKosong } from "./editor-produk";

export function TambahKandidat({ saranParameter }: { saranParameter: string[] }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  return (
    <>
      <Button type="button" variant="teal" onClick={() => setBuka(true)}><Plus /> Tambah produk kandidat</Button>
      {buka && <EditorProduk awal={produkKosong()} saranParameter={saranParameter} onTutup={() => setBuka(false)} onTersimpan={(id) => router.push(`/hta/banding?id=${id}`)} />}
    </>
  );
}
