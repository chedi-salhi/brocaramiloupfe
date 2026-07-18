// Types partagés côté frontend, alignés sur le schema.prisma du backend.

export interface Produit {
  idProduit: number;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  categorieId: number;
  isAvailable: boolean;
  imageUrl: string | null;
  categorie?: Categorie;
}

export interface Categorie {
  idCategorie: number;
  nom: string;
}

export interface CommandeProduit {
  idCommandeProduit: number;
  produitId: number;
  quantite: number;
  prixUnitaire: string;
  produit: Produit;
}

export interface SuiviCommande {
  idSuivi: number;
  etat: EtatCommande;
  commentaire: string | null;
  createdAt: string;
}

export type EtatCommande = "EN_ATTENTE" | "EN_LIVRAISON" | "LIVREE" | "ANNULEE";
export type MethodePaiement = "A_LA_LIVRAISON" | "EN_LIGNE";
export type StatutPaiement = "PENDING" | "SUCCESS" | "FAILED";

export interface Commande {
  idCommande: number;
  utilisateurId: number;
  utilisateur?: {
    idUtilisateur: number;
    nom: string;
    prenom: string | null;
    numTelephone: string | null;
  } | null;
  etat: EtatCommande;
  dateCommande: string;
  montantTotal: string;
  livreurId: number | null;
  livreur?: {
    idUtilisateur: number;
    nom: string;
    prenom: string | null;
    numTelephone: string | null;
  } | null;
  adresseLivraison: string;
  produits: CommandeProduit[];
  historique: SuiviCommande[];
  facture?: {
    idFacture: number;
    numeroFacture: string;
    dateEmission: string;
  } | null;
  paiement?: {
    idPaiement: number;
    montant: string;
    methodePaiement: MethodePaiement;
    statut: StatutPaiement;
    confirmedById: number | null;
  } | null;
}

export interface PanierProduit {
  idPanierProduit: number;
  produitId: number;
  quantite: number;
  prixUnitaire: string;
  produit: Produit;
}

export interface Panier {
  idPanier: number;
  produits: PanierProduit[];
}

export interface Annonce {
  idAnnonce: number;
  titre: string;
  description: string;
  typeMedia: string;
  mediaUrl: string;
  dateDebut: string;
  dateFin: string;
}

export interface Utilisateur {
  idUtilisateur: number;
  email: string;
  nom: string;
  prenom: string | null;
  adresse: string | null;
  numTelephone: string | null;
  isSuspended?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  role?: { name: string } | null;
}
