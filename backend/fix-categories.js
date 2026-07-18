// Corrige le texte des 6 catégories existantes directement via Prisma
// (contourne l'API le temps de diagnostiquer le 500 sur PATCH /categories/:id).
// Ne touche pas aux IDs, donc rien ne casse côté produits déjà liés.
//
// Usage : dans le dossier backend, lancer   node fix-categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const nomsCorrects = [
  'Restauration',
  'Salons de thé & Cafés',
  'Pâtisserie & Boulangerie',
  'Emballages alimentaires',
  'Mariages, Fêtes & Soutenances',
  'Cadeaux & Idées originales',
];

async function main() {
  const existantes = await prisma.categorie.findMany({
    orderBy: { idCategorie: 'asc' },
  });

  if (existantes.length !== nomsCorrects.length) {
    console.warn(
      `Attention : ${existantes.length} catégorie(s) en base mais ${nomsCorrects.length} noms fournis. ` +
        'Vérifie la correspondance avant de continuer.',
    );
  }

  for (let i = 0; i < existantes.length && i < nomsCorrects.length; i++) {
    const before = existantes[i];
    const nom = nomsCorrects[i];
    const updated = await prisma.categorie.update({
      where: { idCategorie: before.idCategorie },
      data: { nom },
    });
    console.log(`OK  id=${updated.idCategorie}  "${before.nom}"  ->  "${updated.nom}"`);
  }
}

main()
  .catch((err) => {
    console.error('Échec :', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
