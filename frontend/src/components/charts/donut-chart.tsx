"use client";

import { useEffect, useState } from "react";

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data }: { data: DonutDatum[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  // Fractions précalculées une seule fois : évite de recalculer d.value/total
  // dans la boucle de décalage cumulé ci-dessous.
  const fractions = data.map((d) => d.value / total);

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 shrink-0">
        <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="18" />
        {data.map((d, i) => {
          const fraction = fractions[i];
          const dash = mounted ? fraction * circumference : 0;
          const gap = circumference - dash;
          // Décalage cumulé des segments précédents, calculé sans muter de
          // variable externe pendant le rendu (mutation détectée par la
          // règle de pureté du React Compiler sur l'ancienne version avec
          // `offsetAcc +=`).
          const offset = fractions.slice(0, i).reduce((sum, f) => sum + f, 0) * circumference;
          return (
            <circle
              key={d.label}
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 700ms ease-out" }}
            />
          );
        })}
        <text
          x="75"
          y="75"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="700"
          fill="var(--foreground)"
          className="rotate-90"
          style={{ transformOrigin: "75px 75px" }}
        >
          {total}
        </text>
      </svg>

      <ul className="flex flex-col gap-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-foreground/70">{d.label}</span>
            <span className="font-medium ml-4">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
