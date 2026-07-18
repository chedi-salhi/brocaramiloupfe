"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  produitId,
  disabled,
}: {
  produitId: number;
  disabled?: boolean;
}) {
  const api = useApi();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      await api("/cart/items", {
        method: "POST",
        body: JSON.stringify({ produitId, quantite: 1 }),
      });
      window.dispatchEvent(new Event("cart-updated"));
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      variant={status === "done" ? "outline" : "primary"}
      className="w-full"
    >
      {status === "loading" && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {status === "done" && "✓ Ajouté"}
      {status === "error" && "Erreur, réessaye"}
      {status === "idle" && (disabled ? "Indisponible" : "Ajouter au panier")}
      {status === "loading" && "Ajout..."}
    </Button>
  );
}
