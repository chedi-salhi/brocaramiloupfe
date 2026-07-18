import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  hoverable = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 transition-all duration-200 ${
        hoverable ? "hover:shadow-lg hover:-translate-y-0.5 hover:border-brand/40" : ""
      } ${className}`}
      {...props}
    />
  );
}
