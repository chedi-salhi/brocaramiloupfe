import { redirect } from "next/navigation";

// Ancienne route : le panier a été déplacé vers /panier (hors du préfixe
// /client protégé par proxy.ts) pour rester accessible aux visiteurs
// anonymes, pas seulement aux clients connectés.
export default function ClientPanierRedirect() {
  redirect("/panier");
}
