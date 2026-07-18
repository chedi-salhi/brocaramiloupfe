import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Protection par rôle des sections /client, /admin, /livreur : le rôle est
// lu depuis le claim realm_access.roles du token Keycloak (voir lib/auth.ts).
// Note : les groupes de routes (public)/(auth) n'affectent pas l'URL, donc
// seules les vraies sections /client, /admin, /livreur ont besoin d'un
// préfixe ici.
const ROLE_BY_PREFIX: Record<string, string> = {
  "/admin": "admin",
  "/client": "client",
  "/livreur": "livreur",
};

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Un admin n'a rien à faire sur le catalogue public : on le renvoie direct
  // sur son tableau de bord plutôt que de le laisser atterrir sur "/".
  if (pathname === "/" && (req.auth?.roles ?? []).includes("admin")) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  }

  const requiredRole = Object.entries(ROLE_BY_PREFIX).find(([prefix]) =>
    pathname.startsWith(prefix),
  )?.[1];

  if (!requiredRole) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const roles = req.auth.roles ?? [];
  if (!roles.includes(requiredRole)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/admin/:path*", "/client/:path*", "/livreur/:path*"],
};
