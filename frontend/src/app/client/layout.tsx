import type { ReactNode } from "react";

// La navigation (Panier / Commandes / Profil) est déjà dans la navbar
// principale — pas besoin de la dupliquer ici.
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>;
}
