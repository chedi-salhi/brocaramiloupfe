import { createHmac, timingSafeEqual } from 'crypto';

// Jeton de vérification d'email "maison" : pas besoin d'un modèle Prisma dédié
// ni de JwtModule (déjà utilisé côté Keycloak pour vérifier des tokens tiers,
// pas pour en signer des nôtres) — juste un HMAC sur un payload base64url avec
// une expiration embarquée. Suffisant pour un lien à usage unique envoyé par email.
const SECRET = process.env.EMAIL_VERIFICATION_SECRET ?? process.env.KEYCLOAK_CLIENT_SECRET ?? 'dev-secret';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function generateVerificationToken(idUtilisateur: number): string {
  const payload = Buffer.from(
    JSON.stringify({ id: idUtilisateur, exp: Date.now() + TTL_MS }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyVerificationToken(token: string): number | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { id, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (typeof id !== 'number' || typeof exp !== 'number' || Date.now() > exp) return null;
    return id;
  } catch {
    return null;
  }
}
