"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fullSignOut } from "@/lib/full-sign-out";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { CartBadge } from "@/components/cart-badge";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`relative py-1 text-sm font-medium transition-colors ${
        active ? "text-brand" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-brand transition-all duration-300 ${
          active ? "w-full" : "w-0"
        }`}
      />
    </Link>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const roles = session?.roles ?? [];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo size={32} />
          <span>
            Broc<span className="text-brand">ara</span>milou
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {/* Un admin n'a pas de raison de parcourir le catalogue (voir aussi
              la redirection "/" -> "/admin" dans proxy.ts). */}
          {!roles.includes("admin") && <NavLink href="/">Catalogue</NavLink>}
          {/* Panier réservé au visiteur (session anonyme) et au client connecté —
              ni le livreur ni l'admin n'achètent, donc pas de lien pour eux.
              Visiteur : juste après le catalogue. Client : entre Favoris et Profil. */}
          {status !== "authenticated" && (
            <NavLink href="/panier">
              Panier
              <CartBadge />
            </NavLink>
          )}
          {roles.includes("client") && (
            <>
              <NavLink href="/client/commandes">Commandes</NavLink>
              <NavLink href="/client/favoris">Favoris</NavLink>
              <NavLink href="/panier">
                Panier
                <CartBadge />
              </NavLink>
              <NavLink href="/client/profil">Profil</NavLink>
            </>
          )}
          {roles.includes("livreur") && <NavLink href="/livreur">Livraisons</NavLink>}
          {roles.includes("admin") && (
            <>
              <NavLink href="/admin">Administration</NavLink>
              <NavLink href="/admin/parametres">Paramètres</NavLink>
            </>
          )}

          {status === "authenticated" && <NotificationBell />}

          {status === "authenticated" ? (
            <Button variant="outline" onClick={() => fullSignOut(session?.idToken)}>
              Déconnexion
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => signIn("keycloak")}>
                Connexion
              </Button>
              <Link href="/inscription">
                <Button variant="primary">Inscription</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
