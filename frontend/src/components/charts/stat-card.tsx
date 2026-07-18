import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  onClick,
  active,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "brand" | "green" | "amber" | "red";
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    brand: "bg-brand/10 text-brand",
    green: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <Card
      onClick={onClick}
      className={`flex items-center gap-4 ${onClick ? "cursor-pointer" : ""} ${
        active ? "ring-2 ring-brand border-brand" : ""
      }`}
    >
      <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-foreground/60">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </Card>
  );
}
