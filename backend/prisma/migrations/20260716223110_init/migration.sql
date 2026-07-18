-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('EN_LIGNE', 'A_LA_LIVRAISON');

-- CreateEnum
CREATE TYPE "EtatCommande" AS ENUM ('EN_ATTENTE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "idUtilisateur" SERIAL NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT NOT NULL,
    "numTelephone" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" INTEGER,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("idUtilisateur")
);

-- CreateTable
CREATE TABLE "Role" (
    "idRole" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("idRole")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "idCategorie" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("idCategorie")
);

-- CreateTable
CREATE TABLE "Produit" (
    "idProduit" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("idProduit")
);

-- CreateTable
CREATE TABLE "Commande" (
    "idCommande" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "etat" "EtatCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCommande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantTotal" DECIMAL(10,2) NOT NULL,
    "livreurId" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "adresseLivraison" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("idCommande")
);

-- CreateTable
CREATE TABLE "SuiviCommande" (
    "idSuivi" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "etat" "EtatCommande" NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuiviCommande_pkey" PRIMARY KEY ("idSuivi")
);

-- CreateTable
CREATE TABLE "Facture" (
    "idFacture" SERIAL NOT NULL,
    "numeroFacture" TEXT NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrinted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("idFacture")
);

-- CreateTable
CREATE TABLE "Annonce" (
    "idAnnonce" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "typeMedia" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("idAnnonce")
);

-- CreateTable
CREATE TABLE "Message" (
    "idMessage" SERIAL NOT NULL,
    "expediteurId" INTEGER NOT NULL,
    "destinataireId" INTEGER,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "contenu" TEXT NOT NULL,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("idMessage")
);

-- CreateTable
CREATE TABLE "MessageLecture" (
    "idMessageLecture" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageLecture_pkey" PRIMARY KEY ("idMessageLecture")
);

-- CreateTable
CREATE TABLE "CommandeProduit" (
    "idCommandeProduit" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeProduit_pkey" PRIMARY KEY ("idCommandeProduit")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "idPaiement" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "methodePaiement" "MethodePaiement" NOT NULL DEFAULT 'A_LA_LIVRAISON',
    "provider" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'PENDING',
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedById" INTEGER,
    "transactionId" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("idPaiement")
);

-- CreateTable
CREATE TABLE "Panier" (
    "idPanier" SERIAL NOT NULL,
    "utilisateurId" INTEGER,
    "sessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panier_pkey" PRIMARY KEY ("idPanier")
);

-- CreateTable
CREATE TABLE "Session" (
    "idSession" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "tempEmail" TEXT,
    "tempData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("idSession")
);

-- CreateTable
CREATE TABLE "PanierProduit" (
    "idPanierProduit" SERIAL NOT NULL,
    "panierId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanierProduit_pkey" PRIMARY KEY ("idPanierProduit")
);

-- CreateTable
CREATE TABLE "Favori" (
    "idFavori" SERIAL NOT NULL,
    "utilisateurId" INTEGER,
    "sessionId" INTEGER,
    "produitId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favori_pkey" PRIMARY KEY ("idFavori")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "idDashboard" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "ventesTotales" DECIMAL(12,2) NOT NULL,
    "commandesTotales" INTEGER NOT NULL,
    "produitsPopulaires" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("idDashboard")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_keycloakId_key" ON "Utilisateur"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_roleId_idx" ON "Utilisateur"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_nom_key" ON "Categorie"("nom");

-- CreateIndex
CREATE INDEX "Produit_categorieId_idx" ON "Produit"("categorieId");

-- CreateIndex
CREATE INDEX "Produit_utilisateurId_idx" ON "Produit"("utilisateurId");

-- CreateIndex
CREATE INDEX "Commande_utilisateurId_idx" ON "Commande"("utilisateurId");

-- CreateIndex
CREATE INDEX "Commande_livreurId_idx" ON "Commande"("livreurId");

-- CreateIndex
CREATE INDEX "Commande_etat_idx" ON "Commande"("etat");

-- CreateIndex
CREATE INDEX "SuiviCommande_commandeId_idx" ON "SuiviCommande"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numeroFacture_key" ON "Facture"("numeroFacture");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_commandeId_key" ON "Facture"("commandeId");

-- CreateIndex
CREATE INDEX "Annonce_utilisateurId_idx" ON "Annonce"("utilisateurId");

-- CreateIndex
CREATE INDEX "Message_destinataireId_isRead_idx" ON "Message"("destinataireId", "isRead");

-- CreateIndex
CREATE INDEX "MessageLecture_utilisateurId_isRead_idx" ON "MessageLecture"("utilisateurId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLecture_messageId_utilisateurId_key" ON "MessageLecture"("messageId", "utilisateurId");

-- CreateIndex
CREATE INDEX "CommandeProduit_commandeId_idx" ON "CommandeProduit"("commandeId");

-- CreateIndex
CREATE INDEX "CommandeProduit_produitId_idx" ON "CommandeProduit"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_commandeId_key" ON "Paiement"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Panier_utilisateurId_key" ON "Panier"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Panier_sessionId_key" ON "Panier"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tempEmail_key" ON "Session"("tempEmail");

-- CreateIndex
CREATE INDEX "PanierProduit_panierId_idx" ON "PanierProduit"("panierId");

-- CreateIndex
CREATE INDEX "PanierProduit_produitId_idx" ON "PanierProduit"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "Favori_utilisateurId_produitId_key" ON "Favori"("utilisateurId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "Favori_sessionId_produitId_key" ON "Favori"("sessionId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_utilisateurId_key" ON "Dashboard"("utilisateurId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("idRole") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("idCategorie") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCommande" ADD CONSTRAINT "SuiviCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("idCommande") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("idCommande") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLecture" ADD CONSTRAINT "MessageLecture_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("idMessage") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLecture" ADD CONSTRAINT "MessageLecture_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeProduit" ADD CONSTRAINT "CommandeProduit_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("idCommande") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeProduit" ADD CONSTRAINT "CommandeProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("idProduit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("idCommande") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panier" ADD CONSTRAINT "Panier_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panier" ADD CONSTRAINT "Panier_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("idSession") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanierProduit" ADD CONSTRAINT "PanierProduit_panierId_fkey" FOREIGN KEY ("panierId") REFERENCES "Panier"("idPanier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanierProduit" ADD CONSTRAINT "PanierProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("idProduit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("idSession") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("idProduit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("idUtilisateur") ON DELETE CASCADE ON UPDATE CASCADE;
