// Conversion d'un montant en dinars tunisiens (2 décimales, ex: 40.000) en
// toutes lettres pour la mention légale "Arrêtée la présente facture à la
// somme de : ..." — même usage que sur les bons de livraison/factures papier.
//
// Spécificité tunisienne : le dinar se divise en 1000 millimes (pas 100
// comme la plupart des devises), d'où le calcul en base 1000 plutôt que 100.

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES_DIX_NEUF = [
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
// Index par dizaine (0 et 1 inutilisés, couverts par UNITES/DIZAINES_DIX_NEUF).
const DIZAINES = [
  '',
  '',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'soixante-dix',
  'quatre-vingt',
  'quatre-vingt-dix',
];

function deuxChiffres(n: number): string {
  if (n < 10) return UNITES[n];
  if (n < 20) return DIZAINES_DIX_NEUF[n - 10];

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  // 70-79 et 90-99 se construisent sur la base de 60/80 + un "teen" (soixante-quinze,
  // quatre-vingt-treize...), avec l'exception classique "soixante et onze".
  if (dizaine === 7 || dizaine === 9) {
    const base = dizaine === 7 ? 'soixante' : 'quatre-vingt';
    if (unite === 1 && dizaine === 7) return `${base} et onze`;
    return `${base}-${DIZAINES_DIX_NEUF[unite]}`;
  }

  if (unite === 0) {
    // "quatre-vingts" prend un s seul, mais le perd dès qu'il est suivi
    // d'autre chose (quatre-vingt-un, quatre-vingt-deux...).
    return dizaine === 8 ? `${DIZAINES[dizaine]}s` : DIZAINES[dizaine];
  }
  if (unite === 1 && dizaine !== 8) {
    return `${DIZAINES[dizaine]} et un`;
  }
  return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
}

function troisChiffres(n: number): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  const parts: string[] = [];

  if (centaines > 0) {
    // "cent" est invariable seul, mais prend un s au pluriel sauf s'il est
    // suivi d'un autre nombre (deux cents / deux cent quarante).
    const motCent = centaines === 1 ? 'cent' : `${UNITES[centaines]} cent${reste === 0 ? 's' : ''}`;
    parts.push(motCent);
  }
  if (reste > 0) parts.push(deuxChiffres(reste));

  return parts.join(' ');
}

function convertirEntier(n: number): string {
  if (n === 0) return 'zéro';

  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  const parts: string[] = [];
  if (millions > 0) {
    parts.push(`${troisChiffres(millions)} million${millions > 1 ? 's' : ''}`);
  }
  if (milliers > 0) {
    // "mille" est toujours invariable (deux mille, jamais "deux milles").
    parts.push(milliers === 1 ? 'mille' : `${troisChiffres(milliers)} mille`);
  }
  if (reste > 0) {
    parts.push(troisChiffres(reste));
  }

  return parts.join(' ');
}

// montant : nombre de dinars avec décimales (ex: 40, 40.5, 1234.999).
// Retourne une chaîne en majuscules, ex: "QUARANTE DINARS ZÉRO MILLIMES".
export function montantEnLettres(montant: number): string {
  const totalMillimes = Math.round(Math.abs(montant) * 1000);
  const dinars = Math.floor(totalMillimes / 1000);
  const millimes = totalMillimes % 1000;

  const dinarsMot = dinars === 1 ? 'dinar' : 'dinars';
  const millimesMot = millimes === 1 ? 'millime' : 'millimes';

  return `${convertirEntier(dinars)} ${dinarsMot} ${convertirEntier(millimes)} ${millimesMot}`.toUpperCase();
}
