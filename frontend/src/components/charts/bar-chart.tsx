"use client";

import { useEffect, useState } from "react";

interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({ data, unit = "" }: { data: BarDatum[]; unit?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return <p className="text-sm text-foreground/50">Pas encore de données.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-sm text-foreground/70 truncate">{d.label}</span>
          <div className="flex-1 h-3 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand transition-all ease-out"
              style={{
                width: mounted ? `${(d.value / max) * 100}%` : "0%",
                transitionDuration: "700ms",
                transitionDelay: `${i * 80}ms`,
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-sm font-medium">
            {d.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
