import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	// ===========================================================================
	// CLIENTS (Entreprises)
	// ===========================================================================
	clients: defineTable({
		// Identité
		raisonSociale: v.string(),
		siren: v.optional(v.string()),
		siret: v.optional(v.string()),
		adresseRue: v.optional(v.string()),
		adresseVille: v.optional(v.string()),
		adresseCodePostal: v.optional(v.string()),
		telephone: v.optional(v.string()),
		email: v.optional(v.string()),

		// Forme juridique
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
				v.literal("SCP"),
				v.literal("Auto-entrepreneur"),
				v.literal("Micro-entreprise"),
				v.literal("Autre"),
			),
		),

		// Activité
		activite: v.optional(
			v.union(
				v.literal("profession_liberale_medicale"),
				v.literal("autres_professions_liberales"),
				v.literal("commerciale_industrielle_artisanale"),
				v.literal("agricole"),
				v.literal("civile"),
			),
		),

		// Catégorie fiscale
		categorieFiscale: v.optional(
			v.union(v.literal("IR-BNC"), v.literal("IR-BIC"), v.literal("IR-RF"), v.literal("IS")),
		),

		// Régime fiscal
		regimeFiscal: v.optional(
			v.union(
				v.literal("reel_normal"),
				v.literal("reel_simplifie"),
				v.literal("reel_complet"),
				v.literal("micro"),
			),
		),

		// Régime TVA
		regimeTVA: v.optional(
			v.union(
				v.literal("franchise_en_base"),
				v.literal("reel_normal"),
				v.literal("rsi"),
				v.literal("exoneree"),
			),
		),

		// Fréquence TVA
		frequenceTVA: v.optional(
			v.union(v.literal("mensuelle"), v.literal("trimestrielle"), v.literal("annuelle")),
		),
		jourTVA: v.optional(v.number()),

		// Clôture comptable
		dateClotureComptable: v.optional(v.string()), // "DD/MM"

		// Chiffres
		caN1: v.optional(v.number()),
		paiementISUnique: v.optional(v.boolean()),

		// Taxes
		montantCFEN1: v.optional(v.number()),
		montantCVAEN1: v.optional(v.number()),
		montantTSN1: v.optional(v.number()),
		nombreEmployes: v.optional(v.number()),
		proprietaire: v.optional(v.boolean()),
		localPro: v.optional(v.boolean()),
		secteur: v.optional(v.string()),
		surfaceCommerciale: v.optional(v.number()),
		departement: v.optional(v.string()),
		taxeFonciere: v.optional(v.boolean()),
		tve: v.optional(v.boolean()),

		// Meta
		notes: v.optional(v.string()),
		status: v.union(v.literal("actif"), v.literal("archive")),
		managerId: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_manager", ["managerId"])
		.index("by_status", ["status"])
		.searchIndex("search_raison_sociale", { searchField: "raisonSociale" }),

	// ===========================================================================
	// CONTACTS
	// ===========================================================================
	contacts: defineTable({
		clientId: v.id("clients"),
		nom: v.string(),
		prenom: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		fonction: v.optional(v.string()),
		isPrincipal: v.boolean(),
	}).index("by_client", ["clientId"]),

	// ===========================================================================
	// DOSSIERS (Missions)
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
		exercice: v.optional(v.string()),
		status: v.union(v.literal("actif"), v.literal("archive"), v.literal("clos")),
		managerId: v.optional(v.string()),
		collaborateurId: v.optional(v.string()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_manager", ["managerId"])
		.index("by_collaborateur", ["collaborateurId"]),

	// ===========================================================================
	// RUNS (Exercices fiscaux)
	// ===========================================================================
	runs: defineTable({
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		exercice: v.number(),
		status: v.union(
			v.literal("a_venir"),
			v.literal("en_cours"),
			v.literal("en_attente"),
			v.literal("termine"),
		),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_dossier", ["dossierId"])
		.index("by_status", ["status"]),

	// ===========================================================================
	// TACHES
	// ===========================================================================
	taches: defineTable({
		runId: v.id("runs"),
		clientId: v.id("clients"),
		nom: v.string(),
		type: v.union(v.literal("fiscale"), v.literal("operationnelle")),
		status: v.union(
			v.literal("a_venir"),
			v.literal("en_cours"),
			v.literal("en_attente"),
			v.literal("termine"),
		),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
		categorie: v.optional(v.string()),
		cerfa: v.optional(v.string()),
		completedAt: v.optional(v.number()),
		notes: v.optional(v.string()),
		sopId: v.optional(v.id("sops")),
		order: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_run", ["runId"])
		.index("by_assigne", ["assigneId"])
		.index("by_status", ["status"])
		.index("by_echeance", ["dateEcheance"]),

	// ===========================================================================
	// GATES (Points de contrôle)
	// ===========================================================================
	gates: defineTable({
		tacheId: v.optional(v.id("taches")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		description: v.optional(v.string()),
		ordre: v.number(),
		preuveAttendue: v.optional(v.string()),
		preuveUrl: v.optional(v.string()),
		status: v.union(v.literal("a_valider"), v.literal("valide"), v.literal("refuse")),
		validateurId: v.optional(v.string()),
		validePar: v.optional(v.string()),
		valideAt: v.optional(v.number()),
		commentaire: v.optional(v.string()),
		escaladeRegle: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_tache", ["tacheId"])
		.index("by_run", ["runId"])
		.index("by_status", ["status"]),

	// ===========================================================================
	// GATE TEMPLATES
	// ===========================================================================
	gateTemplates: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		preuveAttendue: v.optional(v.string()),
		escaladeRegle: v.optional(v.string()),
		ordre: v.number(),
		createdAt: v.number(),
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// TICKETS
	// ===========================================================================
	tickets: defineTable({
		clientId: v.id("clients"),
		ticketTypeId: v.optional(v.id("ticketTypes")),
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
			v.literal("urgente"),
		),
		assigneId: v.optional(v.string()),
		createdById: v.string(),
		resolution: v.optional(v.string()),
		resolvedAt: v.optional(v.number()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_status", ["status"])
		.index("by_assigne", ["assigneId"])
		.index("by_type", ["ticketTypeId"]),

	// ===========================================================================
	// TICKET TYPES
	// ===========================================================================
	ticketTypes: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		couleur: v.optional(v.string()),
		icone: v.optional(v.string()),
		isActive: v.boolean(),
		createdAt: v.number(),
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// DOCUMENTS
	// ===========================================================================
	documents: defineTable({
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		categorieId: v.optional(v.id("documentCategories")),
		storageId: v.string(),
		mimeType: v.optional(v.string()),
		fileSize: v.optional(v.number()),
		uploadedById: v.string(),
		createdAt: v.number(),
	})
		.index("by_client", ["clientId"])
		.index("by_dossier", ["dossierId"])
		.index("by_run", ["runId"])
		.index("by_categorie", ["categorieId"]),

	// ===========================================================================
	// DOCUMENT CATEGORIES
	// ===========================================================================
	documentCategories: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		isActive: v.boolean(),
		createdAt: v.number(),
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// USER PROFILES (rôles et metadata additionnels)
	// ===========================================================================
	userProfiles: defineTable({
		userId: v.string(), // Better Auth user ID
		role: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
		nom: v.optional(v.string()),
		email: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_role", ["role"]),

	// ===========================================================================
	// NOTIFICATIONS
	// ===========================================================================
	notifications: defineTable({
		userId: v.string(),
		type: v.union(
			v.literal("echeance_proche"),
			v.literal("echeance_depassee"),
			v.literal("ticket_cree"),
			v.literal("tache_assignee"),
		),
		titre: v.string(),
		message: v.string(),
		lien: v.optional(v.string()),
		relatedId: v.optional(v.string()),
		isRead: v.boolean(),
		createdAt: v.number(),
	})
		.index("by_user_read", ["userId", "isRead"])
		.index("by_related_type", ["relatedId", "type"]),

	// ===========================================================================
	// SOPs (Procédures opérationnelles standards)
	// ===========================================================================
	sops: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		contenu: v.string(),
		categorie: v.optional(v.string()),
		isActive: v.boolean(),
		createdById: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_nom", ["nom"]),

	// ===========================================================================
	// TACHE TEMPLATES
	// ===========================================================================
	tacheTemplates: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		categorie: v.optional(v.string()),
		sousCategorie: v.optional(v.string()),
		frequence: v.union(
			v.literal("ponctuelle"),
			v.literal("mensuelle"),
			v.literal("trimestrielle"),
			v.literal("annuelle"),
		),
		sopId: v.optional(v.id("sops")),
		estimationHeures: v.optional(v.number()),
		isActive: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_categorie", ["categorie"])
		.index("by_sop", ["sopId"]),

	// ===========================================================================
	// OPPORTUNITES (CRM)
	// ===========================================================================
	opportunites: defineTable({
		nom: v.string(),
		statut: v.union(
			v.literal("prospect"),
			v.literal("contact"),
			v.literal("proposition"),
			v.literal("negociation"),
			v.literal("gagne"),
			v.literal("perdu"),
		),
		source: v.optional(
			v.union(
				v.literal("recommandation"),
				v.literal("reseau"),
				v.literal("site_web"),
				v.literal("salon"),
				v.literal("autre"),
			),
		),
		contactNom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		responsableId: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_statut", ["statut"])
		.index("by_responsable", ["responsableId"]),
})
