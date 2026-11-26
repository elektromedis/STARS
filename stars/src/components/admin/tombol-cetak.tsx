"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TombolCetak() {
  return <Button variant="teal" size="sm" onClick={() => window.print()}><Printer /> Cetak</Button>;
}
