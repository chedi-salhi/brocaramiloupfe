--
-- PostgreSQL database dump
--

-- Dumped from database version 16.14
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: EtatCommande; Type: TYPE; Schema: public; Owner: brocaramilou
--

CREATE TYPE public."EtatCommande" AS ENUM (
    'EN_ATTENTE',
    'EN_LIVRAISON',
    'LIVREE',
    'ANNULEE'
);


ALTER TYPE public."EtatCommande" OWNER TO brocaramilou;

--
-- Name: MethodePaiement; Type: TYPE; Schema: public; Owner: brocaramilou
--

CREATE TYPE public."MethodePaiement" AS ENUM (
    'EN_LIGNE',
    'A_LA_LIVRAISON'
);


ALTER TYPE public."MethodePaiement" OWNER TO brocaramilou;

--
-- Name: StatutPaiement; Type: TYPE; Schema: public; Owner: brocaramilou
--

CREATE TYPE public."StatutPaiement" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public."StatutPaiement" OWNER TO brocaramilou;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Annonce; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Annonce" (
    "idAnnonce" integer NOT NULL,
    titre text NOT NULL,
    description text NOT NULL,
    "typeMedia" text NOT NULL,
    "mediaUrl" text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    "utilisateurId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Annonce" OWNER TO brocaramilou;

--
-- Name: Annonce_idAnnonce_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Annonce_idAnnonce_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Annonce_idAnnonce_seq" OWNER TO brocaramilou;

--
-- Name: Annonce_idAnnonce_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Annonce_idAnnonce_seq" OWNED BY public."Annonce"."idAnnonce";


--
-- Name: Categorie; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Categorie" (
    "idCategorie" integer NOT NULL,
    nom text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Categorie" OWNER TO brocaramilou;

--
-- Name: Categorie_idCategorie_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Categorie_idCategorie_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Categorie_idCategorie_seq" OWNER TO brocaramilou;

--
-- Name: Categorie_idCategorie_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Categorie_idCategorie_seq" OWNED BY public."Categorie"."idCategorie";


--
-- Name: Commande; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Commande" (
    "idCommande" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    etat public."EtatCommande" DEFAULT 'EN_ATTENTE'::public."EtatCommande" NOT NULL,
    "dateCommande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "montantTotal" numeric(10,2) NOT NULL,
    "livreurId" integer,
    "assignedAt" timestamp(3) without time zone,
    "adresseLivraison" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Commande" OWNER TO brocaramilou;

--
-- Name: CommandeProduit; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."CommandeProduit" (
    "idCommandeProduit" integer NOT NULL,
    "commandeId" integer NOT NULL,
    "produitId" integer NOT NULL,
    quantite integer NOT NULL,
    "prixUnitaire" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CommandeProduit" OWNER TO brocaramilou;

--
-- Name: CommandeProduit_idCommandeProduit_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."CommandeProduit_idCommandeProduit_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CommandeProduit_idCommandeProduit_seq" OWNER TO brocaramilou;

--
-- Name: CommandeProduit_idCommandeProduit_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."CommandeProduit_idCommandeProduit_seq" OWNED BY public."CommandeProduit"."idCommandeProduit";


--
-- Name: Commande_idCommande_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Commande_idCommande_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Commande_idCommande_seq" OWNER TO brocaramilou;

--
-- Name: Commande_idCommande_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Commande_idCommande_seq" OWNED BY public."Commande"."idCommande";


--
-- Name: Dashboard; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Dashboard" (
    "idDashboard" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    "ventesTotales" numeric(12,2) NOT NULL,
    "commandesTotales" integer NOT NULL,
    "produitsPopulaires" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Dashboard" OWNER TO brocaramilou;

--
-- Name: Dashboard_idDashboard_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Dashboard_idDashboard_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Dashboard_idDashboard_seq" OWNER TO brocaramilou;

--
-- Name: Dashboard_idDashboard_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Dashboard_idDashboard_seq" OWNED BY public."Dashboard"."idDashboard";


--
-- Name: Facture; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Facture" (
    "idFacture" integer NOT NULL,
    "numeroFacture" text NOT NULL,
    "commandeId" integer NOT NULL,
    montant numeric(10,2) NOT NULL,
    "dateEmission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isPrinted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Facture" OWNER TO brocaramilou;

--
-- Name: Facture_idFacture_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Facture_idFacture_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Facture_idFacture_seq" OWNER TO brocaramilou;

--
-- Name: Facture_idFacture_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Facture_idFacture_seq" OWNED BY public."Facture"."idFacture";


--
-- Name: Favori; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Favori" (
    "idFavori" integer NOT NULL,
    "utilisateurId" integer,
    "sessionId" integer,
    "produitId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Favori" OWNER TO brocaramilou;

--
-- Name: Favori_idFavori_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Favori_idFavori_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Favori_idFavori_seq" OWNER TO brocaramilou;

--
-- Name: Favori_idFavori_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Favori_idFavori_seq" OWNED BY public."Favori"."idFavori";


--
-- Name: Message; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Message" (
    "idMessage" integer NOT NULL,
    "expediteurId" integer NOT NULL,
    "destinataireId" integer,
    "isBroadcast" boolean DEFAULT false NOT NULL,
    contenu text NOT NULL,
    "dateEnvoi" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Message" OWNER TO brocaramilou;

--
-- Name: MessageLecture; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."MessageLecture" (
    "idMessageLecture" integer NOT NULL,
    "messageId" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone
);


ALTER TABLE public."MessageLecture" OWNER TO brocaramilou;

--
-- Name: MessageLecture_idMessageLecture_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."MessageLecture_idMessageLecture_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MessageLecture_idMessageLecture_seq" OWNER TO brocaramilou;

--
-- Name: MessageLecture_idMessageLecture_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."MessageLecture_idMessageLecture_seq" OWNED BY public."MessageLecture"."idMessageLecture";


--
-- Name: Message_idMessage_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Message_idMessage_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Message_idMessage_seq" OWNER TO brocaramilou;

--
-- Name: Message_idMessage_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Message_idMessage_seq" OWNED BY public."Message"."idMessage";


--
-- Name: Paiement; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Paiement" (
    "idPaiement" integer NOT NULL,
    "commandeId" integer NOT NULL,
    montant numeric(10,2) NOT NULL,
    "methodePaiement" public."MethodePaiement" DEFAULT 'A_LA_LIVRAISON'::public."MethodePaiement" NOT NULL,
    provider text,
    statut public."StatutPaiement" DEFAULT 'PENDING'::public."StatutPaiement" NOT NULL,
    "datePaiement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "confirmedById" integer,
    "transactionId" text,
    "notificationSent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Paiement" OWNER TO brocaramilou;

--
-- Name: Paiement_idPaiement_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Paiement_idPaiement_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Paiement_idPaiement_seq" OWNER TO brocaramilou;

--
-- Name: Paiement_idPaiement_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Paiement_idPaiement_seq" OWNED BY public."Paiement"."idPaiement";


--
-- Name: Panier; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Panier" (
    "idPanier" integer NOT NULL,
    "utilisateurId" integer,
    "sessionId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Panier" OWNER TO brocaramilou;

--
-- Name: PanierProduit; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."PanierProduit" (
    "idPanierProduit" integer NOT NULL,
    "panierId" integer NOT NULL,
    "produitId" integer NOT NULL,
    quantite integer NOT NULL,
    "prixUnitaire" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PanierProduit" OWNER TO brocaramilou;

--
-- Name: PanierProduit_idPanierProduit_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."PanierProduit_idPanierProduit_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PanierProduit_idPanierProduit_seq" OWNER TO brocaramilou;

--
-- Name: PanierProduit_idPanierProduit_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."PanierProduit_idPanierProduit_seq" OWNED BY public."PanierProduit"."idPanierProduit";


--
-- Name: Panier_idPanier_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Panier_idPanier_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Panier_idPanier_seq" OWNER TO brocaramilou;

--
-- Name: Panier_idPanier_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Panier_idPanier_seq" OWNED BY public."Panier"."idPanier";


--
-- Name: Produit; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Produit" (
    "idProduit" integer NOT NULL,
    nom text NOT NULL,
    description text NOT NULL,
    prix numeric(10,2) NOT NULL,
    stock integer NOT NULL,
    "categorieId" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "imageUrl" text
);


ALTER TABLE public."Produit" OWNER TO brocaramilou;

--
-- Name: Produit_idProduit_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Produit_idProduit_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Produit_idProduit_seq" OWNER TO brocaramilou;

--
-- Name: Produit_idProduit_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Produit_idProduit_seq" OWNED BY public."Produit"."idProduit";


--
-- Name: Role; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Role" (
    "idRole" integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO brocaramilou;

--
-- Name: Role_idRole_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Role_idRole_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_idRole_seq" OWNER TO brocaramilou;

--
-- Name: Role_idRole_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Role_idRole_seq" OWNED BY public."Role"."idRole";


--
-- Name: Session; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Session" (
    "idSession" integer NOT NULL,
    token text NOT NULL,
    "tempEmail" text,
    "tempData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO brocaramilou;

--
-- Name: Session_idSession_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Session_idSession_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Session_idSession_seq" OWNER TO brocaramilou;

--
-- Name: Session_idSession_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Session_idSession_seq" OWNED BY public."Session"."idSession";


--
-- Name: SuiviCommande; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."SuiviCommande" (
    "idSuivi" integer NOT NULL,
    "commandeId" integer NOT NULL,
    etat public."EtatCommande" NOT NULL,
    commentaire text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SuiviCommande" OWNER TO brocaramilou;

--
-- Name: SuiviCommande_idSuivi_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."SuiviCommande_idSuivi_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SuiviCommande_idSuivi_seq" OWNER TO brocaramilou;

--
-- Name: SuiviCommande_idSuivi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."SuiviCommande_idSuivi_seq" OWNED BY public."SuiviCommande"."idSuivi";


--
-- Name: Utilisateur; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public."Utilisateur" (
    "idUtilisateur" integer NOT NULL,
    "keycloakId" text NOT NULL,
    nom text NOT NULL,
    prenom text,
    email text NOT NULL,
    "numTelephone" text,
    adresse text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roleId" integer,
    "isSuspended" boolean DEFAULT false NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Utilisateur" OWNER TO brocaramilou;

--
-- Name: Utilisateur_idUtilisateur_seq; Type: SEQUENCE; Schema: public; Owner: brocaramilou
--

CREATE SEQUENCE public."Utilisateur_idUtilisateur_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Utilisateur_idUtilisateur_seq" OWNER TO brocaramilou;

--
-- Name: Utilisateur_idUtilisateur_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: brocaramilou
--

ALTER SEQUENCE public."Utilisateur_idUtilisateur_seq" OWNED BY public."Utilisateur"."idUtilisateur";


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: brocaramilou
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO brocaramilou;

--
-- Name: Annonce idAnnonce; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Annonce" ALTER COLUMN "idAnnonce" SET DEFAULT nextval('public."Annonce_idAnnonce_seq"'::regclass);


--
-- Name: Categorie idCategorie; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Categorie" ALTER COLUMN "idCategorie" SET DEFAULT nextval('public."Categorie_idCategorie_seq"'::regclass);


--
-- Name: Commande idCommande; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Commande" ALTER COLUMN "idCommande" SET DEFAULT nextval('public."Commande_idCommande_seq"'::regclass);


--
-- Name: CommandeProduit idCommandeProduit; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."CommandeProduit" ALTER COLUMN "idCommandeProduit" SET DEFAULT nextval('public."CommandeProduit_idCommandeProduit_seq"'::regclass);


--
-- Name: Dashboard idDashboard; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Dashboard" ALTER COLUMN "idDashboard" SET DEFAULT nextval('public."Dashboard_idDashboard_seq"'::regclass);


--
-- Name: Facture idFacture; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Facture" ALTER COLUMN "idFacture" SET DEFAULT nextval('public."Facture_idFacture_seq"'::regclass);


--
-- Name: Favori idFavori; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Favori" ALTER COLUMN "idFavori" SET DEFAULT nextval('public."Favori_idFavori_seq"'::regclass);


--
-- Name: Message idMessage; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Message" ALTER COLUMN "idMessage" SET DEFAULT nextval('public."Message_idMessage_seq"'::regclass);


--
-- Name: MessageLecture idMessageLecture; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."MessageLecture" ALTER COLUMN "idMessageLecture" SET DEFAULT nextval('public."MessageLecture_idMessageLecture_seq"'::regclass);


--
-- Name: Paiement idPaiement; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Paiement" ALTER COLUMN "idPaiement" SET DEFAULT nextval('public."Paiement_idPaiement_seq"'::regclass);


--
-- Name: Panier idPanier; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Panier" ALTER COLUMN "idPanier" SET DEFAULT nextval('public."Panier_idPanier_seq"'::regclass);


--
-- Name: PanierProduit idPanierProduit; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."PanierProduit" ALTER COLUMN "idPanierProduit" SET DEFAULT nextval('public."PanierProduit_idPanierProduit_seq"'::regclass);


--
-- Name: Produit idProduit; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Produit" ALTER COLUMN "idProduit" SET DEFAULT nextval('public."Produit_idProduit_seq"'::regclass);


--
-- Name: Role idRole; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Role" ALTER COLUMN "idRole" SET DEFAULT nextval('public."Role_idRole_seq"'::regclass);


--
-- Name: Session idSession; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Session" ALTER COLUMN "idSession" SET DEFAULT nextval('public."Session_idSession_seq"'::regclass);


--
-- Name: SuiviCommande idSuivi; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."SuiviCommande" ALTER COLUMN "idSuivi" SET DEFAULT nextval('public."SuiviCommande_idSuivi_seq"'::regclass);


--
-- Name: Utilisateur idUtilisateur; Type: DEFAULT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Utilisateur" ALTER COLUMN "idUtilisateur" SET DEFAULT nextval('public."Utilisateur_idUtilisateur_seq"'::regclass);


--
-- Data for Name: Annonce; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Annonce" ("idAnnonce", titre, description, "typeMedia", "mediaUrl", "dateDebut", "dateFin", "utilisateurId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Categorie; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Categorie" ("idCategorie", nom, "createdAt", "updatedAt") FROM stdin;
10	Restauration Salons de th?? & Caf??s	2026-07-17 21:03:21.185	2026-07-17 21:03:21.185
11	 P??tisserie & Boulangerie 	2026-07-17 21:03:44.804	2026-07-17 21:03:44.804
12	 Emballages alimentaires 	2026-07-17 21:04:13.661	2026-07-17 21:04:13.661
13	Mariages, F??tes & Soutenances	2026-07-17 21:04:23.08	2026-07-17 21:04:23.08
14	Cadeaux & Id??es originales	2026-07-17 21:04:31.054	2026-07-17 21:04:31.054
\.


--
-- Data for Name: Commande; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Commande" ("idCommande", "utilisateurId", etat, "dateCommande", "montantTotal", "livreurId", "assignedAt", "adresseLivraison", "createdAt", "updatedAt") FROM stdin;
2	1	EN_LIVRAISON	2026-07-17 11:36:00.049	29.99	\N	\N	12 rue de la Paix, Tunis	2026-07-17 11:36:00.049	2026-07-17 13:20:24.723
3	2	LIVREE	2026-07-17 16:23:09.017	29.99	92	2026-07-17 17:04:12.607	1	2026-07-17 16:23:09.017	2026-07-17 18:19:00.209
4	1	LIVREE	2026-07-17 18:24:02.764	29.99	92	2026-07-17 18:25:13.353	12 rue deguech 	2026-07-17 18:24:02.764	2026-07-17 21:52:31.706
6	520	LIVREE	2026-07-18 00:02:48.453	42.24	92	2026-07-18 00:03:11.083	deguech zaouit al arab	2026-07-18 00:02:48.453	2026-07-18 00:03:54.661
1	1	LIVREE	2026-07-17 09:31:23.711	59.98	92	2026-07-17 23:10:53.215	12 rue de la Paix, Tunis	2026-07-17 09:31:23.711	2026-07-18 15:07:53.776
7	520	LIVREE	2026-07-18 15:26:17.336	57.24	92	2026-07-18 15:28:00.081	deguech zaouit al arab	2026-07-18 15:26:17.336	2026-07-18 15:28:32.505
5	1	LIVREE	2026-07-17 18:43:39.522	12.25	92	2026-07-17 21:16:57.834	12	2026-07-17 18:43:39.522	2026-07-18 15:28:42.723
\.


--
-- Data for Name: CommandeProduit; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."CommandeProduit" ("idCommandeProduit", "commandeId", "produitId", quantite, "prixUnitaire", "createdAt", "updatedAt") FROM stdin;
1	1	1	2	29.99	2026-07-17 09:31:23.711	2026-07-17 09:31:23.711
2	2	1	1	29.99	2026-07-17 11:36:00.049	2026-07-17 11:36:00.049
3	3	1	1	29.99	2026-07-17 16:23:09.017	2026-07-17 16:23:09.017
4	4	1	1	29.99	2026-07-17 18:24:02.764	2026-07-17 18:24:02.764
5	5	2	1	12.25	2026-07-17 18:43:39.522	2026-07-17 18:43:39.522
6	6	2	1	12.25	2026-07-18 00:02:48.453	2026-07-18 00:02:48.453
7	6	1	1	29.99	2026-07-18 00:02:48.453	2026-07-18 00:02:48.453
8	7	3	1	15.00	2026-07-18 15:26:17.336	2026-07-18 15:26:17.336
9	7	2	1	12.25	2026-07-18 15:26:17.336	2026-07-18 15:26:17.336
10	7	1	1	29.99	2026-07-18 15:26:17.336	2026-07-18 15:26:17.336
\.


--
-- Data for Name: Dashboard; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Dashboard" ("idDashboard", "utilisateurId", "ventesTotales", "commandesTotales", "produitsPopulaires", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Facture; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Facture" ("idFacture", "numeroFacture", "commandeId", montant, "dateEmission", "isPrinted", "createdAt", "updatedAt") FROM stdin;
1	FAC-2026-000001	2	29.99	2026-07-17 11:37:33.26	t	2026-07-17 11:37:33.26	2026-07-17 23:09:39.096
2	FAC-2026-000002	4	29.99	2026-07-18 15:07:58.308	f	2026-07-18 15:07:58.308	2026-07-18 15:07:58.308
3	FAC-2026-000003	6	42.24	2026-07-18 15:08:07.963	f	2026-07-18 15:08:07.963	2026-07-18 15:08:07.963
4	FAC-2026-000004	7	57.24	2026-07-18 15:28:14.073	f	2026-07-18 15:28:14.073	2026-07-18 15:28:14.073
\.


--
-- Data for Name: Favori; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Favori" ("idFavori", "utilisateurId", "sessionId", "produitId", "createdAt", "updatedAt") FROM stdin;
1	1	\N	1	2026-07-17 08:23:56.789	2026-07-17 08:27:33.641
3	520	\N	3	2026-07-18 14:53:22.649	2026-07-18 14:53:22.649
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Message" ("idMessage", "expediteurId", "destinataireId", "isBroadcast", contenu, "dateEnvoi", "isRead", "createdAt", "updatedAt") FROM stdin;
1	2	1	f	Bonjour, ceci est un test	2026-07-17 13:26:08.098	t	2026-07-17 13:26:08.098	2026-07-17 21:46:20.656
2	2	1	f	Bonjour, ceci est un test	2026-07-17 13:53:37.394	t	2026-07-17 13:53:37.394	2026-07-17 21:46:20.656
3	2	1	f	Bonjour, ceci est un test	2026-07-17 13:57:04.674	t	2026-07-17 13:57:04.674	2026-07-17 21:46:20.656
4	2	1	f	bonjour	2026-07-17 16:51:56.216	t	2026-07-17 16:51:56.216	2026-07-17 21:46:20.656
5	1	2	f	salut	2026-07-17 17:07:59.211	t	2026-07-17 17:07:59.211	2026-07-17 21:49:51.977
6	92	2	f	salut	2026-07-17 21:51:50.052	t	2026-07-17 21:51:50.052	2026-07-17 21:51:55.634
7	2	92	f	salut ??a va ? 	2026-07-17 21:52:08.245	t	2026-07-17 21:52:08.245	2026-07-17 21:52:22.896
8	520	92	f	bonjour	2026-07-18 00:03:33.573	f	2026-07-18 00:03:33.573	2026-07-18 00:03:33.573
9	520	92	f	dfd	2026-07-18 00:03:35.207	f	2026-07-18 00:03:35.207	2026-07-18 00:03:35.207
10	520	92	f	qdfs	2026-07-18 00:03:35.846	f	2026-07-18 00:03:35.846	2026-07-18 00:03:35.846
11	520	92	f	d	2026-07-18 00:03:36.244	f	2026-07-18 00:03:36.244	2026-07-18 00:03:36.244
12	520	92	f	sdg	2026-07-18 00:03:36.628	f	2026-07-18 00:03:36.628	2026-07-18 00:03:36.628
13	520	92	f	sd	2026-07-18 00:03:36.851	f	2026-07-18 00:03:36.851	2026-07-18 00:03:36.851
14	520	92	f	gsd	2026-07-18 00:03:37.299	f	2026-07-18 00:03:37.299	2026-07-18 00:03:37.299
15	520	92	f	gsdg	2026-07-18 00:03:38.138	f	2026-07-18 00:03:38.138	2026-07-18 00:03:38.138
16	520	2	f	cc	2026-07-18 16:01:38.62	t	2026-07-18 16:01:38.62	2026-07-20 09:19:27.19
\.


--
-- Data for Name: MessageLecture; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."MessageLecture" ("idMessageLecture", "messageId", "utilisateurId", "isRead", "readAt") FROM stdin;
\.


--
-- Data for Name: Paiement; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Paiement" ("idPaiement", "commandeId", montant, "methodePaiement", provider, statut, "datePaiement", "confirmedById", "transactionId", "notificationSent", "createdAt", "updatedAt") FROM stdin;
1	1	59.98	A_LA_LIVRAISON	\N	SUCCESS	2026-07-17 09:31:23.711	2	\N	t	2026-07-17 09:31:23.711	2026-07-17 11:16:39.475
2	2	29.99	A_LA_LIVRAISON	\N	SUCCESS	2026-07-17 11:36:00.049	2	\N	t	2026-07-17 11:36:00.049	2026-07-17 11:37:30.435
3	3	29.99	EN_LIGNE	\N	PENDING	2026-07-17 16:23:09.017	\N	\N	f	2026-07-17 16:23:09.017	2026-07-17 16:23:09.017
5	5	12.25	EN_LIGNE	\N	PENDING	2026-07-17 18:43:39.522	\N	\N	f	2026-07-17 18:43:39.522	2026-07-17 18:43:39.522
4	4	29.99	A_LA_LIVRAISON	\N	SUCCESS	2026-07-17 18:24:02.764	92	\N	t	2026-07-17 18:24:02.764	2026-07-18 15:07:56.196
6	6	42.24	A_LA_LIVRAISON	\N	SUCCESS	2026-07-18 00:02:48.453	92	\N	t	2026-07-18 00:02:48.453	2026-07-18 15:08:05.861
7	7	57.24	A_LA_LIVRAISON	\N	SUCCESS	2026-07-18 15:26:17.336	92	\N	t	2026-07-18 15:26:17.336	2026-07-18 15:28:11.223
\.


--
-- Data for Name: Panier; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Panier" ("idPanier", "utilisateurId", "sessionId", "createdAt", "updatedAt") FROM stdin;
1	1	\N	2026-07-17 08:16:02.165	2026-07-17 08:17:08.384
2	2	\N	2026-07-17 14:34:16.438	2026-07-17 14:34:16.438
3	\N	3	2026-07-17 14:43:11.265	2026-07-17 14:43:11.265
4	520	\N	2026-07-17 23:15:57.352	2026-07-17 23:15:57.352
5	\N	5	2026-07-18 14:46:12.218	2026-07-18 14:46:12.218
6	\N	6	2026-07-18 15:02:06.24	2026-07-18 15:02:06.24
7	\N	9	2026-07-18 15:47:30.866	2026-07-18 15:47:30.866
8	1391	\N	2026-07-18 15:47:31.181	2026-07-18 15:47:31.181
\.


--
-- Data for Name: PanierProduit; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."PanierProduit" ("idPanierProduit", "panierId", "produitId", quantite, "prixUnitaire", "createdAt", "updatedAt") FROM stdin;
7	1	2	1	12.25	2026-07-17 19:20:42.126	2026-07-17 19:20:42.126
11	3	3	1	15.00	2026-07-18 12:24:31.331	2026-07-18 12:24:31.331
10	3	2	2	12.25	2026-07-18 10:56:22.151	2026-07-18 12:24:32.277
4	3	1	2	29.99	2026-07-17 14:43:11.271	2026-07-18 12:24:33.881
\.


--
-- Data for Name: Produit; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Produit" ("idProduit", nom, description, prix, stock, "categorieId", "utilisateurId", "createdAt", "updatedAt", "isAvailable", "imageUrl") FROM stdin;
3	pate feuillet??e	pate feuillet??e Napolis	15.00	2	11	2	2026-07-18 11:16:48.008	2026-07-18 15:26:17.363	t	https://res.cloudinary.com/dex83nxuo/image/upload/v1784383677/brocaramilou/c9xetwkbssdid7ohnir7.jpg
1	cafe nebli	cafe melang?? 	29.99	43	10	2	2026-07-17 00:17:13.45	2026-07-18 15:26:17.368	t	https://res.cloudinary.com/dex83nxuo/image/upload/v1784383705/brocaramilou/pzb4ttp5eof6cyuk8miu.jpg
4	P??te de Pistache BGH 500g	P??te de Pistache BGH 500g	15.00	120	11	2	2026-07-18 17:32:12.285	2026-07-18 17:32:12.285	t	https://res.cloudinary.com/dex83nxuo/image/upload/v1784395933/brocaramilou/lqqywia5mt22dnwvqoq9.jpg
2	mozzarella majeste 1kg	Fromages	12.25	87	10	2	2026-07-17 18:42:57.496	2026-07-18 17:33:37.265	t	https://res.cloudinary.com/dex83nxuo/image/upload/v1784383695/brocaramilou/nvfpyzhj1s1t34sd6hji.png
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Role" ("idRole", name) FROM stdin;
1	admin
2	client
3	livreur
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Session" ("idSession", token, "tempEmail", "tempData", "createdAt", "expiresAt") FROM stdin;
1	visiteur-test-1	\N	\N	2026-07-17 08:16:02.154	2026-08-16 08:16:02.151
2	visiteur-test-2	\N	\N	2026-07-17 08:23:56.782	2026-08-16 08:23:56.78
3	826f36db-8c05-4c8e-8db4-3853447886d7	\N	\N	2026-07-17 14:43:11.257	2026-08-16 14:43:11.256
4	45551961-02d2-4f94-93d7-e44daab38a68	\N	\N	2026-07-17 23:18:41.033	2026-08-16 23:18:41.032
5	f2b8c477-ed69-4b47-b095-d0eb61f3ba19	\N	\N	2026-07-17 23:51:14.948	2026-08-16 23:51:14.947
6	a7bd8fca-59c5-4772-a580-80b8a2779f33	\N	\N	2026-07-18 15:02:06.213	2026-08-17 15:02:06.211
9	eb7689d4-e37d-4dc8-9a58-29242f127880	\N	\N	2026-07-18 15:45:52.542	2026-08-17 15:45:52.541
\.


--
-- Data for Name: SuiviCommande; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."SuiviCommande" ("idSuivi", "commandeId", etat, commentaire, "createdAt") FROM stdin;
1	1	EN_ATTENTE	\N	2026-07-17 09:31:23.711
2	2	EN_ATTENTE	\N	2026-07-17 11:36:00.049
3	2	EN_LIVRAISON	\N	2026-07-17 13:20:24.723
4	3	EN_ATTENTE	\N	2026-07-17 16:23:09.017
5	3	EN_LIVRAISON	\N	2026-07-17 18:18:58.233
6	3	LIVREE	\N	2026-07-17 18:19:00.209
7	4	EN_ATTENTE	\N	2026-07-17 18:24:02.764
8	5	EN_ATTENTE	\N	2026-07-17 18:43:39.522
9	4	EN_LIVRAISON	\N	2026-07-17 21:14:58.464
10	4	LIVREE	\N	2026-07-17 21:52:31.706
11	6	EN_ATTENTE	\N	2026-07-18 00:02:48.453
12	6	EN_LIVRAISON	\N	2026-07-18 00:03:45.803
13	6	LIVREE	\N	2026-07-18 00:03:54.661
14	1	EN_LIVRAISON	\N	2026-07-18 15:07:44.488
15	1	LIVREE	\N	2026-07-18 15:07:53.776
16	5	EN_LIVRAISON	\N	2026-07-18 15:08:20.699
17	7	EN_ATTENTE	\N	2026-07-18 15:26:17.336
18	7	EN_LIVRAISON	\N	2026-07-18 15:28:31.064
19	7	LIVREE	\N	2026-07-18 15:28:32.505
20	5	LIVREE	\N	2026-07-18 15:28:42.723
\.


--
-- Data for Name: Utilisateur; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public."Utilisateur" ("idUtilisateur", "keycloakId", nom, prenom, email, "numTelephone", adresse, "createdAt", "updatedAt", "roleId", "isSuspended", "isVerified") FROM stdin;
1391	7b61545c-ac50-449b-842e-fe6969b442e0	taryaki	chedi	chadi5marat@gmail.com	55544725	mehdia	2026-07-18 15:46:48.211	2026-07-18 17:30:34.332	2	f	t
92	1553b52b-50be-44d8-b02a-a07fa62d4679	hedi	med	mohemedhedi@gmail.com	55554444	12 rue palastine tozeur	2026-07-17 17:02:09.386	2026-07-18 17:30:36.17	3	f	t
1	d882d023-0cf9-41e7-9c69-fbce34fa6a3f	salhi	chedi	salhichedy2@gmail.com	\N	\N	2026-07-16 23:25:17.976	2026-07-17 21:57:43.504	2	f	t
2	4b706727-6918-4cdc-9765-9da8dd74b2bb	Admin	Test	testadmin@example.com	\N	\N	2026-07-17 00:17:13.441	2026-07-20 09:19:30.02	1	f	t
520	660ec5ff-c24f-47cd-a37d-e5d5297c7740	salhi	fares	salhi08fares@gmail.com	96420898	deguech zaouit al arab	2026-07-17 21:58:39.801	2026-07-20 09:19:17.434	2	f	t
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: brocaramilou
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
75907d8c-9fe1-44ad-bc76-39d23e3a3a37	c17d944ab591dc2ed180bf9572cc97699e044e5b30a706d5fed3bb8988ea6e80	2026-07-16 23:31:11.232044+01	20260716223110_init	\N	\N	2026-07-16 23:31:10.852092+01	1
3832ae26-2710-4cca-a993-5d49d86d0fe6	295a05bd84758c5257c20edab861d8dff60e1f9010c60b7e3b7e21d5edcb11ef	2026-07-17 17:49:02.091625+01	20260717164902_add_produit_image	\N	\N	2026-07-17 17:49:02.080065+01	1
\.


--
-- Name: Annonce_idAnnonce_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Annonce_idAnnonce_seq"', 1, false);


--
-- Name: Categorie_idCategorie_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Categorie_idCategorie_seq"', 14, true);


--
-- Name: CommandeProduit_idCommandeProduit_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."CommandeProduit_idCommandeProduit_seq"', 10, true);


--
-- Name: Commande_idCommande_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Commande_idCommande_seq"', 7, true);


--
-- Name: Dashboard_idDashboard_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Dashboard_idDashboard_seq"', 1, false);


--
-- Name: Facture_idFacture_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Facture_idFacture_seq"', 4, true);


--
-- Name: Favori_idFavori_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Favori_idFavori_seq"', 4, true);


--
-- Name: MessageLecture_idMessageLecture_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."MessageLecture_idMessageLecture_seq"', 1, false);


--
-- Name: Message_idMessage_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Message_idMessage_seq"', 16, true);


--
-- Name: Paiement_idPaiement_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Paiement_idPaiement_seq"', 7, true);


--
-- Name: PanierProduit_idPanierProduit_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."PanierProduit_idPanierProduit_seq"', 19, true);


--
-- Name: Panier_idPanier_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Panier_idPanier_seq"', 8, true);


--
-- Name: Produit_idProduit_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Produit_idProduit_seq"', 4, true);


--
-- Name: Role_idRole_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Role_idRole_seq"', 3, true);


--
-- Name: Session_idSession_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Session_idSession_seq"', 9, true);


--
-- Name: SuiviCommande_idSuivi_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."SuiviCommande_idSuivi_seq"', 20, true);


--
-- Name: Utilisateur_idUtilisateur_seq; Type: SEQUENCE SET; Schema: public; Owner: brocaramilou
--

SELECT pg_catalog.setval('public."Utilisateur_idUtilisateur_seq"', 1996, true);


--
-- Name: Annonce Annonce_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Annonce"
    ADD CONSTRAINT "Annonce_pkey" PRIMARY KEY ("idAnnonce");


--
-- Name: Categorie Categorie_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Categorie"
    ADD CONSTRAINT "Categorie_pkey" PRIMARY KEY ("idCategorie");


--
-- Name: CommandeProduit CommandeProduit_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."CommandeProduit"
    ADD CONSTRAINT "CommandeProduit_pkey" PRIMARY KEY ("idCommandeProduit");


--
-- Name: Commande Commande_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Commande"
    ADD CONSTRAINT "Commande_pkey" PRIMARY KEY ("idCommande");


--
-- Name: Dashboard Dashboard_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Dashboard"
    ADD CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("idDashboard");


--
-- Name: Facture Facture_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Facture"
    ADD CONSTRAINT "Facture_pkey" PRIMARY KEY ("idFacture");


--
-- Name: Favori Favori_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Favori"
    ADD CONSTRAINT "Favori_pkey" PRIMARY KEY ("idFavori");


--
-- Name: MessageLecture MessageLecture_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."MessageLecture"
    ADD CONSTRAINT "MessageLecture_pkey" PRIMARY KEY ("idMessageLecture");


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("idMessage");


--
-- Name: Paiement Paiement_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_pkey" PRIMARY KEY ("idPaiement");


--
-- Name: PanierProduit PanierProduit_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."PanierProduit"
    ADD CONSTRAINT "PanierProduit_pkey" PRIMARY KEY ("idPanierProduit");


--
-- Name: Panier Panier_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Panier"
    ADD CONSTRAINT "Panier_pkey" PRIMARY KEY ("idPanier");


--
-- Name: Produit Produit_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Produit"
    ADD CONSTRAINT "Produit_pkey" PRIMARY KEY ("idProduit");


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("idRole");


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("idSession");


--
-- Name: SuiviCommande SuiviCommande_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."SuiviCommande"
    ADD CONSTRAINT "SuiviCommande_pkey" PRIMARY KEY ("idSuivi");


--
-- Name: Utilisateur Utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("idUtilisateur");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Annonce_utilisateurId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Annonce_utilisateurId_idx" ON public."Annonce" USING btree ("utilisateurId");


--
-- Name: Categorie_nom_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Categorie_nom_key" ON public."Categorie" USING btree (nom);


--
-- Name: CommandeProduit_commandeId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "CommandeProduit_commandeId_idx" ON public."CommandeProduit" USING btree ("commandeId");


--
-- Name: CommandeProduit_produitId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "CommandeProduit_produitId_idx" ON public."CommandeProduit" USING btree ("produitId");


--
-- Name: Commande_etat_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Commande_etat_idx" ON public."Commande" USING btree (etat);


--
-- Name: Commande_livreurId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Commande_livreurId_idx" ON public."Commande" USING btree ("livreurId");


--
-- Name: Commande_utilisateurId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Commande_utilisateurId_idx" ON public."Commande" USING btree ("utilisateurId");


--
-- Name: Dashboard_utilisateurId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Dashboard_utilisateurId_key" ON public."Dashboard" USING btree ("utilisateurId");


--
-- Name: Facture_commandeId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Facture_commandeId_key" ON public."Facture" USING btree ("commandeId");


--
-- Name: Facture_numeroFacture_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Facture_numeroFacture_key" ON public."Facture" USING btree ("numeroFacture");


--
-- Name: Favori_sessionId_produitId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Favori_sessionId_produitId_key" ON public."Favori" USING btree ("sessionId", "produitId");


--
-- Name: Favori_utilisateurId_produitId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Favori_utilisateurId_produitId_key" ON public."Favori" USING btree ("utilisateurId", "produitId");


--
-- Name: MessageLecture_messageId_utilisateurId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "MessageLecture_messageId_utilisateurId_key" ON public."MessageLecture" USING btree ("messageId", "utilisateurId");


--
-- Name: MessageLecture_utilisateurId_isRead_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "MessageLecture_utilisateurId_isRead_idx" ON public."MessageLecture" USING btree ("utilisateurId", "isRead");


--
-- Name: Message_destinataireId_isRead_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Message_destinataireId_isRead_idx" ON public."Message" USING btree ("destinataireId", "isRead");


--
-- Name: Paiement_commandeId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Paiement_commandeId_key" ON public."Paiement" USING btree ("commandeId");


--
-- Name: PanierProduit_panierId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "PanierProduit_panierId_idx" ON public."PanierProduit" USING btree ("panierId");


--
-- Name: PanierProduit_produitId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "PanierProduit_produitId_idx" ON public."PanierProduit" USING btree ("produitId");


--
-- Name: Panier_sessionId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Panier_sessionId_key" ON public."Panier" USING btree ("sessionId");


--
-- Name: Panier_utilisateurId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Panier_utilisateurId_key" ON public."Panier" USING btree ("utilisateurId");


--
-- Name: Produit_categorieId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Produit_categorieId_idx" ON public."Produit" USING btree ("categorieId");


--
-- Name: Produit_utilisateurId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Produit_utilisateurId_idx" ON public."Produit" USING btree ("utilisateurId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: Session_tempEmail_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Session_tempEmail_key" ON public."Session" USING btree ("tempEmail");


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: SuiviCommande_commandeId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "SuiviCommande_commandeId_idx" ON public."SuiviCommande" USING btree ("commandeId");


--
-- Name: Utilisateur_email_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Utilisateur_email_key" ON public."Utilisateur" USING btree (email);


--
-- Name: Utilisateur_keycloakId_key; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE UNIQUE INDEX "Utilisateur_keycloakId_key" ON public."Utilisateur" USING btree ("keycloakId");


--
-- Name: Utilisateur_roleId_idx; Type: INDEX; Schema: public; Owner: brocaramilou
--

CREATE INDEX "Utilisateur_roleId_idx" ON public."Utilisateur" USING btree ("roleId");


--
-- Name: Annonce Annonce_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Annonce"
    ADD CONSTRAINT "Annonce_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CommandeProduit CommandeProduit_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."CommandeProduit"
    ADD CONSTRAINT "CommandeProduit_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."Commande"("idCommande") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommandeProduit CommandeProduit_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."CommandeProduit"
    ADD CONSTRAINT "CommandeProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"("idProduit") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Commande Commande_livreurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Commande"
    ADD CONSTRAINT "Commande_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Commande Commande_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Commande"
    ADD CONSTRAINT "Commande_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dashboard Dashboard_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Dashboard"
    ADD CONSTRAINT "Dashboard_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Facture Facture_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Facture"
    ADD CONSTRAINT "Facture_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."Commande"("idCommande") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favori Favori_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Favori"
    ADD CONSTRAINT "Favori_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"("idProduit") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Favori Favori_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Favori"
    ADD CONSTRAINT "Favori_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."Session"("idSession") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favori Favori_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Favori"
    ADD CONSTRAINT "Favori_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageLecture MessageLecture_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."MessageLecture"
    ADD CONSTRAINT "MessageLecture_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"("idMessage") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageLecture MessageLecture_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."MessageLecture"
    ADD CONSTRAINT "MessageLecture_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_destinataireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_expediteurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Paiement Paiement_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."Commande"("idCommande") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Paiement Paiement_confirmedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PanierProduit PanierProduit_panierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."PanierProduit"
    ADD CONSTRAINT "PanierProduit_panierId_fkey" FOREIGN KEY ("panierId") REFERENCES public."Panier"("idPanier") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PanierProduit PanierProduit_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."PanierProduit"
    ADD CONSTRAINT "PanierProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"("idProduit") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Panier Panier_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Panier"
    ADD CONSTRAINT "Panier_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."Session"("idSession") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Panier Panier_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Panier"
    ADD CONSTRAINT "Panier_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Produit Produit_categorieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Produit"
    ADD CONSTRAINT "Produit_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES public."Categorie"("idCategorie") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Produit Produit_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Produit"
    ADD CONSTRAINT "Produit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"("idUtilisateur") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SuiviCommande SuiviCommande_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."SuiviCommande"
    ADD CONSTRAINT "SuiviCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."Commande"("idCommande") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Utilisateur Utilisateur_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brocaramilou
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"("idRole") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

