# --- build : compile TypeScript + génère le client Prisma ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# npm ci refuse le lockfile sur ce projet (écart cross-plateforme
# Windows/Linux sur des dépendances optionnelles, voir frontend/Dockerfile) —
# npm install est plus tolérant.
RUN npm install

COPY . .
# prisma.config.ts exige DATABASE_URL même pour "generate" (qui ne se
# connecte pourtant jamais à la base) — valeur factice, la vraie vient de
# docker-compose.yml au démarrage du conteneur, pas du build de l'image.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
RUN npm run build

# --- runtime : uniquement les dépendances de prod + le build compilé ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate

COPY --from=build /app/dist ./dist
# Stockage local legacy (obsolète depuis Cloudinary, voir .gitignore) — gardé
# pour que useStaticAssets() ne pointe pas vers un dossier inexistant.
COPY uploads ./uploads

EXPOSE 3001
# dist/src/main.js et non dist/main.js : sans "rootDir" explicite dans
# tsconfig.json, TypeScript prend comme racine le plus petit dossier commun
# à tous les fichiers compilés — comme prisma.config.ts vit à la racine du
# projet (hors de src/), ça inclut src/ comme sous-dossier dans dist/.
CMD ["node", "dist/src/main"]
