import { generateVerificationToken, verifyVerificationToken } from './verification-token';

describe('verification-token', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('génère un token que verifyVerificationToken sait relire (round-trip)', () => {
    const token = generateVerificationToken(42);
    expect(verifyVerificationToken(token)).toBe(42);
  });

  it('renvoie null si le token a été modifié (payload altéré)', () => {
    const token = generateVerificationToken(42);
    const [, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ id: 999, exp: Date.now() + 60_000 }),
    ).toString('base64url');
    expect(verifyVerificationToken(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it('renvoie null si la signature est modifiée', () => {
    const token = generateVerificationToken(42);
    const [payload] = token.split('.');
    expect(verifyVerificationToken(`${payload}.signature-invalide`)).toBeNull();
  });

  it('renvoie null pour un token malformé (pas de séparateur)', () => {
    expect(verifyVerificationToken('token-sans-point')).toBeNull();
  });

  it('renvoie null pour une chaîne vide', () => {
    expect(verifyVerificationToken('')).toBeNull();
  });

  it('expire après 24h', () => {
    const realNow = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(realNow);
    const token = generateVerificationToken(7);

    // Juste avant l'expiration : toujours valide.
    jest.spyOn(Date, 'now').mockReturnValue(realNow + 24 * 60 * 60 * 1000 - 1000);
    expect(verifyVerificationToken(token)).toBe(7);

    // Juste après : expiré.
    jest.spyOn(Date, 'now').mockReturnValue(realNow + 24 * 60 * 60 * 1000 + 1000);
    expect(verifyVerificationToken(token)).toBeNull();
  });

  it('deux tokens générés pour des ids différents restent valides indépendamment', () => {
    const a = generateVerificationToken(1);
    const b = generateVerificationToken(2);
    expect(verifyVerificationToken(a)).toBe(1);
    expect(verifyVerificationToken(b)).toBe(2);
  });
});
