import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:scale-[0.97] shadow-sm hover:shadow-md shadow-brand/20",
  outline:
    "border border-border text-foreground hover:border-brand hover:text-brand active:scale-[0.97]",
  ghost: "text-foreground hover:bg-surface-muted active:scale-[0.97]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
