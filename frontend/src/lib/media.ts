const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Les URLs renvoyées par POST /uploads sont relatives ("/uploads/xxx.jpg"),
// servies par le backend (port 3001), pas par Next.js (port 3000) — il faut
// donc préfixer pour un <img src> correct.
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}${url}`;
}
