import type { ReactNode } from "react";
import { AdminNavLink } from "@/components/admin/admin-nav-link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <nav className="flex gap-5 text-sm mb-6 border-b border-border pb-3">
        <AdminNavLink href="/admin">Tableau de bord</AdminNavLink>
        <AdminNavLink href="/admin/produits">Produits</AdminNavLink>
        <AdminNavLink href="/admin/inventaire">Inventaire</AdminNavLink>
        <AdminNavLink href="/admin/commandes">Commandes</AdminNavLink>
        <AdminNavLink href="/admin/utilisateurs">Utilisateurs</AdminNavLink>
        <AdminNavLink href="/admin/annonces">Annonces</AdminNavLink>
        <AdminNavLink href="/admin/messages">Messages</AdminNavLink>
      </nav>
      {children}
    </div>
  );
}
