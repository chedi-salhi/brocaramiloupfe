"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { fullSignOut } from "@/lib/full-sign-out";

const ROLE_LABEL: Record<string, string> = { admin: "Administrateur", livreur: "Livreur", client: "Client" };
const PROFILE_LINK: Record<string, string> = {
  admin: "/admin/parametres",
  livreur: "/livreur/profil",
  client: "/client/profil",
};

// Avatar + prénom + menu déroulant (profil, déconnexion) affiché dans la navbar
// à la place du bouton "Déconnexion" seul. Le nom vient de la base locale
// (GET /auth/me : prénom + nom saisis par l'utilisateur) avec le nom du token
// Keycloak en secours le temps du chargement.
export function UserMenu() {
  const { data: session } = useSession();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const roles = session?.roles ?? [];
  const role = ["admin", "livreur", "client"].find((r) => roles.includes(r));

  useEffect(() => {
    api<{ nom?: string; prenom?: string | null }>("/auth/me")
      .then((me) => setFullName([me.prenom, me.nom].filter(Boolean).join(" ") || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ferme le menu au clic extérieur ou sur Échap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = fullName ?? session?.user?.name ?? session?.user?.email ?? "Mon compte";
  const firstName = name.split(" ")[0];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const profileHref = role ? PROFILE_LINK[role] : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Menu utilisateur"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border pl-1 pr-3 py-1 hover:bg-surface-muted transition-colors"
      >
        <span className="h-7 w-7 rounded-full bg-brand text-white text-sm font-semibold flex items-center justify-center">
          {initial}
        </span>
        <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{firstName}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg overflow-hidden animate-fade-in-scale z-50"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold truncate">{name}</p>
            {role && <p className="text-xs text-foreground/50">{ROLE_LABEL[role]}</p>}
          </div>
          {profileHref && (
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-muted transition-colors"
            >
              {role === "admin" ? "Paramètres" : "Mon profil"}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => fullSignOut(session?.idToken)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-surface-muted transition-colors border-t border-border"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
