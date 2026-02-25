// =============================================================================
// V7LVET ERP — Convex Schema Draft
// Cabinet d'expertise comptable — ERP interne
// =============================================================================
// Ce fichier est un brouillon complet du schéma Convex pour le projet V7LVET.
// Il couvre : utilisateurs, clients, contacts, dossiers, runs, tâches, gates,
// tickets, documents, notifications, et les tables de configuration.
// =============================================================================

import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	// ===========================================================================
	// USERS
	// ===========================================================================
	// Étend la table user de Better Auth avec le rôle métier et la hiérarchie.
	// Better Auth gère déjà id, name, email, emailVerified, image, createdAt, updatedAt.
	// On ajoute ici les champs spécifiques au cabinet.
	// ===========================================================================
	users: defineTable({
		// Champs Better Auth de base (gérés par le plugin, listés pour référence)
		name: v.string(),
		email: v.string(),
		emailVerified: v.boolean(),
		image: v.optional(v.string()),

		// Champs métier V7LVET
		role: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
		// Hiérarchie : le manager direct de cet utilisateur
		managerId: v.optional(v.id("users")),

		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_email", ["email"])
		.index("by_role", ["role"])
		.index("by_manager", ["managerId"]),

	// ===========================================================================
	// CLIENTS (Entreprises)
	// ===========================================================================
	// Fiche client ultra-complète : identité, forme juridique, régime fiscal,
	// TVA, taxes locales, et métadonnées de gestion.
	// ===========================================================================
	clients: defineTable({
		// --- Identité ---
		raisonSociale: v.string(),
		siren: v.optional(v.string()), // 9 chiffres
		siret: v.optional(v.string()), // 14 chiffres
		adresseRue: v.optional(v.string()),
		adresseVille: v.optional(v.string()),
		adresseCodePostal: v.optional(v.string()),
		telephone: v.optional(v.string()),
		email: v.optional(v.string()),

		// --- Forme juridique ---
		formeJuridique: v.optional(
			v.union(
				v.literal("SARL"),
				v.literal("SAS"),
				v.literal("SA"),
				v.literal("SASU"),
				v.literal("EI"),
				v.literal("SNC"),
				v.literal("SCI"),
				v.literal("EURL"),
				v.literal("SELARL"),
				v.literal("SCM"),
				v.literal("Autre"),
			),
		),

		// --- Activité ---
		activite: v.optional(
			v.union(
				v.literal("profession_liberale_medicale"),
				v.literal("autres_professions_liberales"),
				v.literal("commerciale"),
				v.literal("industrielle"),
				v.literal("artisanale"),
				v.literal("agricole"),
				v.literal("civile"),
			),
		),

		// --- Catégorie fiscale ---
		categorieFiscale: v.optional(
			v.union(v.literal("IR-BNC"), v.literal("IR-BIC"), v.literal("IR-RF"), v.literal("IS")),
		),

		// --- Régime fiscal ---
		regimeFiscal: v.optional(
			v.union(v.literal("reel_normal"), v.literal("reel_simplifie"), v.literal("micro")),
		),

		// --- Régime TVA ---
		regimeTVA: v.optional(
			v.union(
				v.literal("franchise_en_base"),
				v.literal("reel_normal"),
				v.literal("rsi"),
				v.literal("exoneree"),
			),
		),

		// --- Fréquence et jour de déclaration TVA ---
		frequenceTVA: v.optional(
			v.union(v.literal("mensuelle"), v.literal("trimestrielle"), v.literal("annuelle")),
		),
		jourTVA: v.optional(v.number()), // Jour du mois de la déclaration

		// --- Clôture comptable ---
		dateClotureComptable: v.optional(v.string()), // Format "DD/MM"

		// --- Chiffre d'affaires N-1 ---
		caN1: v.optional(v.number()),

		// --- Paiement IS en une seule fois ---
		paiementISUnique: v.optional(v.boolean()),

		// --- Taxes et cotisations ---
		montantCFEN1: v.optional(v.number()), // Cotisation foncière des entreprises N-1
		montantTSN1: v.optional(v.number()), // Taxe sur les salaires N-1
		nombreEmployes: v.optional(v.number()),
		proprietaire: v.optional(v.boolean()), // Le client est-il propriétaire de ses locaux ?
		localPro: v.optional(v.boolean()), // Possède un local professionnel ?
		secteur: v.optional(v.string()),
		surfaceCommerciale: v.optional(v.number()), // En m²
		departement: v.optional(v.string()), // Code département
		taxeFonciere: v.optional(v.boolean()), // Assujetti à la taxe foncière ?
		tve: v.optional(v.boolean()), // Taxe sur les véhicules de société

		// --- Métadonnées ---
		notes: v.optional(v.string()),
		status: v.union(v.literal("actif"), v.literal("archive")),
		managerId: v.optional(v.id("users")), // Responsable de ce client
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_manager", ["managerId"])
		.index("by_status", ["status"])
		.index("by_raison_sociale", ["raisonSociale"]),

	// ===========================================================================
	// CONTACTS
	// ===========================================================================
	// Personnes physiques rattachées à un client (dirigeant, comptable interne…).
	// Un contact peut être marqué comme principal.
	// ===========================================================================
	contacts: defineTable({
		clientId: v.id("clients"),
		nom: v.string(),
		prenom: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		fonction: v.optional(v.string()), // Ex : "Gérant", "DAF", "Secrétaire"
		isPrincipal: v.boolean(), // Contact principal du client
	}).index("by_client", ["clientId"]),

	// ===========================================================================
	// DOSSIERS (Missions)
	// ===========================================================================
	// Un dossier représente une mission confiée par un client au cabinet.
	// Types : comptabilité, paie, audit, conseil, fiscal.
	// ===========================================================================
	dossiers: defineTable({
		clientId: v.id("clients"),
		nom: v.string(),
		type: v.union(
			v.literal("compta"),
			v.literal("paie"),
			v.literal("audit"),
			v.literal("conseil"),
			v.literal("fiscal"),
		),
		exercice: v.number(), // Année de l'exercice (ex : 2026)
		status: v.union(v.literal("actif"), v.literal("archive"), v.literal("clos")),
		managerId: v.optional(v.id("users")),
		collaborateurId: v.optional(v.id("users")),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_manager", ["managerId"])
		.index("by_collaborateur", ["collaborateurId"]),

	// ===========================================================================
	// RUNS
	// ===========================================================================
	// Un "run" correspond à un exercice fiscal pour un client.
	// Il sert de conteneur pour les tâches et les gates d'un exercice donné.
	// ===========================================================================
	runs: defineTable({
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		exercice: v.number(), // Année (ex : 2026)
		status: v.union(v.literal("a_venir"), v.literal("en_cours"), v.literal("termine")),
		createdAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_dossier", ["dossierId"])
		.index("by_status", ["status"]),

	// ===========================================================================
	// TACHES
	// ===========================================================================
	// Tâches individuelles rattachées à un run.
	// Peuvent être fiscales (liées à un CERFA) ou opérationnelles.
	// L'ordre (order) permet le tri dans l'interface.
	// ===========================================================================
	taches: defineTable({
		runId: v.id("runs"),
		nom: v.string(),
		type: v.union(v.literal("fiscale"), v.literal("operationnelle")),
		status: v.union(
			v.literal("a_venir"),
			v.literal("en_cours"),
			v.literal("en_attente"),
			v.literal("termine"),
		),
		dateEcheance: v.optional(v.number()), // Timestamp de l'échéance
		assigneId: v.optional(v.id("users")),
		categorie: v.optional(v.string()), // Catégorie libre (ex : "TVA", "IS", "Bilan")
		cerfa: v.optional(v.string()), // Référence du formulaire CERFA si tâche fiscale
		completedAt: v.optional(v.number()),
		completedById: v.optional(v.id("users")),
		notes: v.optional(v.string()),
		order: v.number(), // Ordre d'affichage dans le run
	})
		.index("by_run", ["runId"])
		.index("by_assigne", ["assigneId"])
		.index("by_status", ["status"])
		.index("by_echeance", ["dateEcheance"]),

	// ===========================================================================
	// GATES (Points de contrôle)
	// ===========================================================================
	// Une gate est un checkpoint de validation.
	// Elle peut être liée à une tâche spécifique ou directement à un run.
	// Le responsable doit fournir une preuve (fichier ou lien) pour valider.
	// ===========================================================================
	gates: defineTable({
		tacheId: v.optional(v.id("taches")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		responsableId: v.id("users"),

		// Preuve attendue et fournie
		preuveAttendue: v.string(), // Description de ce qui est attendu
		preuveUrl: v.optional(v.string()), // URL du fichier uploadé
		preuveLien: v.optional(v.string()), // Lien externe (ex : lien DGFiP)

		// Validation
		status: v.union(v.literal("en_attente"), v.literal("valide"), v.literal("rejete")),
		validePar: v.optional(v.id("users")),
		valideAt: v.optional(v.number()),
		commentaire: v.optional(v.string()),

		// Règle d'escalade en cas de blocage
		escaladeRegle: v.optional(v.string()),
	})
		.index("by_tache", ["tacheId"])
		.index("by_run", ["runId"])
		.index("by_status", ["status"]),

	// ===========================================================================
	// GATE TEMPLATES
	// ===========================================================================
	// Modèles de gates réutilisables.
	// L'admin peut créer des templates qui seront appliqués automatiquement
	// lors de la création d'un run.
	// ===========================================================================
	gateTemplates: defineTable({
		nom: v.string(),
		preuveAttendue: v.string(),
		escaladeRegle: v.optional(v.string()),
		order: v.number(), // Ordre d'application dans le run
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// TICKETS (Anomalies / Exceptions)
	// ===========================================================================
	// Système de tickets pour signaler des anomalies, des demandes spéciales,
	// ou des exceptions à traiter pour un client.
	// Le type est configurable via la table ticketTypes.
	// ===========================================================================
	tickets: defineTable({
		clientId: v.id("clients"),
		type: v.string(), // Référence libre vers un ticketType.nom
		titre: v.string(),
		description: v.optional(v.string()),
		status: v.union(
			v.literal("ouvert"),
			v.literal("en_cours"),
			v.literal("resolu"),
			v.literal("ferme"),
		),
		priorite: v.union(
			v.literal("basse"),
			v.literal("normale"),
			v.literal("haute"),
			v.literal("critique"),
		),
		assigneId: v.optional(v.id("users")),
		createdById: v.id("users"),
		resolvedAt: v.optional(v.number()),
		resolvedById: v.optional(v.id("users")),
		notes: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_status", ["status"])
		.index("by_assigne", ["assigneId"])
		.index("by_type", ["type"]),

	// ===========================================================================
	// TICKET TYPES (Catégories configurables)
	// ===========================================================================
	// L'admin peut créer des types de tickets personnalisés.
	// Exemples : "Anomalie comptable", "Demande client", "Relance".
	// ===========================================================================
	ticketTypes: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		color: v.optional(v.string()), // Code couleur hex (ex : "#FF5722")
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// DOCUMENTS
	// ===========================================================================
	// Fichiers uploadés via Convex File Storage.
	// Rattachés à un client, et optionnellement à un dossier.
	// Classés par catégorie configurable (documentCategories).
	// ===========================================================================
	documents: defineTable({
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		nom: v.string(),
		categorieId: v.optional(v.id("documentCategories")),
		fileStorageId: v.string(), // ID du fichier dans Convex File Storage
		mimeType: v.optional(v.string()),
		size: v.optional(v.number()), // Taille en octets
		uploadedById: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_dossier", ["dossierId"])
		.index("by_categorie", ["categorieId"]),

	// ===========================================================================
	// DOCUMENT CATEGORIES (Catégories configurables)
	// ===========================================================================
	// Catégories de documents créées par l'admin.
	// Exemples : "Bilan", "Liasse fiscale", "Contrat", "Facture".
	// ===========================================================================
	documentCategories: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// NOTIFICATIONS
	// ===========================================================================
	// Notifications in-app envoyées aux utilisateurs.
	// Types : échéance proche, échéance dépassée, ticket créé, tâche assignée.
	// L'index compound by_user_read permet de filtrer rapidement les non-lues.
	// ===========================================================================
	notifications: defineTable({
		userId: v.id("users"),
		type: v.union(
			v.literal("echeance_proche"),
			v.literal("echeance_depassee"),
			v.literal("ticket_cree"),
			v.literal("tache_assignee"),
		),
		titre: v.string(),
		message: v.string(),
		lien: v.optional(v.string()), // URL interne vers la ressource concernée
		isRead: v.boolean(),
		createdAt: v.number(),
	})
		// Index compound : récupérer les notifications non-lues d'un utilisateur
		.index("by_user_read", ["userId", "isRead"]),
})
