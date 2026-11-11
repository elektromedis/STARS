import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, delta, trend, hint }: { label: string; value: string; delta?: string; trend?: "up" | "down"; hint?: string }) {
  const Icon = trend === "down" ? TrendingDown : TrendingUp;
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-navy-800 md:text-3xl">{value}</p>
      {delta && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", trend === "down" ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800")}>
            <Icon className="size-3" aria-hidden />
            {delta}
          </span>
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </p>
      )}
    </Card>
  );
}
