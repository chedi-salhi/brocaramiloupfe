"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Utilisateur } from "@/lib/types";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

const ROLES = ["admin", "client", "livreur"];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-brand/10 text-brand",
  client: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  livreur: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

export function UsersAdmin({ utilisateurs }: { utilisateurs: Utilisateur[] }) {
  const api = useApi();
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "admin" | "client" | "livreur">("all");

  async function toggleSuspend(u: Utilisateur) {
    setBusyId(u.idUtilisateur);
    try {
      await api(`/users/${u.idUtilisateur}/${u.isSuspended ? "unsuspend" : "suspend"}`, {
        method: "PATCH",
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: Utilisateur, role: string) {
    if (role === u.role?.name) return;
    setBusyId(u.idUtilisateur);
    try {
      await api(`/users/${u.idUtilisateur}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const filtered =
    filter === "all" ? utilisateurs : utilisateurs.filter((u) => u.role?.name === filter);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <div className="flex gap-1.5">
          {(["all", "admin", "client", "livreur"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs px-3 py-1"
            >
              {f === "all" ? "Tous" : f}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 stagger">
        {filtered.map((u) => (
          <div
            key={u.idUtilisateur}
            className="flex items-center gap-4 border border-border rounded-lg p-3 bg-surface flex-wrap"
          >
            <div className="flex-1 min-w-[160px]">
              <p className="font-medium">
                {u.prenom} {u.nom}
              </p>
              <p className="text-sm text-foreground/60">{u.email}</p>
            </div>

            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ROLE_BADGE[u.role?.name ?? ""] ?? "bg-surface-muted text-foreground/50"}`}
            >
              {u.role?.name ?? "aucun rôle"}
            </span>

            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                u.isSuspended
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              }`}
            >
              {u.isSuspended ? "Suspendu" : "Actif"}
            </span>

            <select
              disabled={busyId === u.idUtilisateur}
              value={u.role?.name ?? ""}
              onChange={(e) => changeRole(u, e.target.value)}
              className="border border-border rounded-md p-1.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            >
              <option value="" disabled>
                Rôle...
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              disabled={busyId === u.idUtilisateur}
              onClick={() => toggleSuspend(u)}
              className={u.isSuspended ? "" : "text-red-600"}
            >
              {u.isSuspended ? "Réactiver" : "Suspendre"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
