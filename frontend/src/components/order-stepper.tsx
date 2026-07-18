import type { EtatCommande } from "@/lib/types";

const STEPS: { key: EtatCommande; label: string }[] = [
  { key: "EN_ATTENTE", label: "En attente" },
  { key: "EN_LIVRAISON", label: "En livraison" },
  { key: "LIVREE", label: "Livrée" },
];

export function OrderStepper({ etat }: { etat: EtatCommande }) {
  if (etat === "ANNULEE") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 px-4 py-3 animate-fade-in">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
        <span className="font-medium">Commande annulée</span>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === etat);

  return (
    <div className="flex items-center animate-fade-in">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors duration-500 ${
                  done
                    ? "bg-brand border-brand text-white"
                    : active
                      ? "border-brand text-brand animate-pulse-ring"
                      : "border-border text-foreground/40"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${active ? "text-brand font-medium" : "text-foreground/50"}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full overflow-hidden bg-border">
                <div
                  className="h-full bg-brand transition-all duration-700 ease-out"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
