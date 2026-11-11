import { Badge } from "@/components/ui/badge";

/** Status serapan anggaran: Terserap (sudah direalisasikan) atau Direncanakan. */
export function StatusBadge({ serapan }: { serapan: boolean }) {
  return serapan ? <Badge variant="success">Terserap</Badge> : <Badge variant="teal">Direncanakan</Badge>;
}
