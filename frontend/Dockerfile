# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

# Les variables NEXT_PUBLIC_* sont figées dans le bundle navigateur au moment
# du build (contrairement aux variables serveur, lues au runtime) — elles
# doivent donc arriver ici en argument de build, pas en "environment:" du
# docker-compose (qui ne s'appliquerait qu'au démarrage du conteneur, trop
# tard pour du code déjà compilé et envoyé au navigateur).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_KEYCLOAK_ISSUER
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_KEYCLOAK_ISSUER=$NEXT_PUBLIC_KEYCLOAK_ISSUER

COPY package*.json ./
# npm ci refusait le lockfile ("picomatch@2.3.2 does not satisfy
# picomatch@4.0.5") — écart de résolution des dépendances optionnelles
# entre Windows (où le lockfile a été généré) et Linux (l'image Docker).
# npm install est plus tolérant à ce genre de divergence cross-plateforme.
RUN npm install

COPY . .
RUN npm run build

# --- runtime : sortie "standalone" (serveur Node minimal, voir next.config.ts) ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
