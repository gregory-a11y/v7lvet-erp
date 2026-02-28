import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// Shared validator for fiscal rule conditions
const fiscalConditionValidator = v.object({
	champ: v.string(),
	operateur: v.union(
		v.literal("equals"),
		v.literal("not_equals"),
		v.literal("in"),
		v.literal("not_in"),
		v.literal("gt"),
		v.literal("gte"),
		v.literal("lt"),
		v.literal("lte"),
		v.literal("is_true"),
		v.literal("is_false"),
		v.literal("is_set"),
		v.literal("is_not_set"),
	),
	valeur: v.optional(v.any()),
})

// Shared validator for date formula
const dateFormuleValidator = v.object({
	type: v.union(
		v.literal("fixed"),
		v.literal("relative_to_cloture"),
		v.literal("cloture_conditional"),
		v.literal("end_of_month_plus_offset"),
		v.literal("end_of_quarter_plus_offset"),
		v.literal("relative_to_ago"),
	),
	params: v.any(),
})

// Shared validator for fiscal rule tasks
const fiscalTaskValidator = v.object({
	nom: v.string(),
	categorie: v.optional(v.string()),
	cerfa: v.optional(v.string()),
	dateFormule: dateFormuleValidator,
	repeat: v.optional(
		v.object({
			frequence: v.union(v.literal("mensuelle"), v.literal("trimestrielle")),
			moisExclus: v.optional(v.array(v.number())),
		}),
	),
})

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
	})
		.index("by_client", ["clientId"])
		.index("by_client_principal", ["clientId", "isPrincipal"]),

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
		.index("by_status", ["status"])
		.index("by_client_status", ["clientId", "status"]),

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
		.index("by_echeance", ["dateEcheance"])
		.index("by_client", ["clientId"]),

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
		.index("by_categorie", ["categorieId"])
		.index("by_createdAt", ["createdAt"]),

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
		role: v.union(v.literal("admin"), v.literal("manager"), v.literal("collaborateur")),
		nom: v.optional(v.string()),
		email: v.optional(v.string()),
		avatarStorageId: v.optional(v.string()),
		sections: v.optional(v.array(v.string())),
		mustChangePassword: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_role", ["role"]),

	// ===========================================================================
	// PRESENCE (Online status)
	// ===========================================================================
	presence: defineTable({
		userId: v.string(),
		lastSeen: v.number(),
	}).index("by_userId", ["userId"]),

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
			v.literal("nouveau_message"),
			v.literal("mention"),
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
	// SOP CATEGORIES
	// ===========================================================================
	sopCategories: defineTable({
		nom: v.string(),
		slug: v.string(),
		color: v.optional(v.string()),
		isDefault: v.boolean(),
		isActive: v.boolean(),
		createdAt: v.number(),
	}).index("by_slug", ["slug"]),

	// ===========================================================================
	// SOPs (Procédures opérationnelles standards)
	// ===========================================================================
	sops: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		contenu: v.string(),
		categorie: v.optional(v.string()), // legacy — will be removed after migration
		categorieId: v.optional(v.id("sopCategories")),
		videoUrl: v.optional(v.string()),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.string(),
					fileSize: v.number(),
				}),
			),
		),
		isActive: v.boolean(),
		createdById: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_nom", ["nom"])
		.index("by_categorie", ["categorieId"]),

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

	// ===========================================================================
	// FISCAL RULES (Règles fiscales configurables)
	// ===========================================================================
	fiscalRules: defineTable({
		nom: v.string(),
		description: v.optional(v.string()),
		isActive: v.boolean(),
		ordre: v.number(),

		// Root conditions (implicit AND between all)
		conditions: v.array(fiscalConditionValidator),

		// Branches: sub-conditions with specific tasks
		branches: v.array(
			v.object({
				nom: v.string(),
				conditions: v.array(fiscalConditionValidator),
				taches: v.array(fiscalTaskValidator),
			}),
		),

		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_active", ["isActive"])
		.index("by_ordre", ["ordre"]),

	// ===========================================================================
	// FISCAL MINDMAP (Arbre de décision fiscal — singleton)
	// ===========================================================================
	fiscalMindmap: defineTable({
		nodes: v.array(
			v.object({
				id: v.string(),
				type: v.string(),
				position: v.object({ x: v.number(), y: v.number() }),
				data: v.any(),
			}),
		),
		edges: v.array(
			v.object({
				id: v.string(),
				source: v.string(),
				target: v.string(),
				sourceHandle: v.optional(v.string()),
				label: v.optional(v.string()),
				animated: v.optional(v.boolean()),
				style: v.optional(v.any()),
			}),
		),
		updatedAt: v.number(),
	}),

	// ===========================================================================
	// CONVERSATIONS (Messagerie)
	// ===========================================================================
	conversations: defineTable({
		type: v.union(v.literal("direct"), v.literal("group"), v.literal("client")),
		name: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		createdById: v.string(),
		lastMessageAt: v.optional(v.number()),
		lastMessagePreview: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_type", ["type"])
		.index("by_lastMessage", ["lastMessageAt"])
		.index("by_client", ["clientId"]),

	// ===========================================================================
	// CONVERSATION MEMBERS
	// ===========================================================================
	conversationMembers: defineTable({
		conversationId: v.id("conversations"),
		userId: v.string(),
		lastReadAt: v.optional(v.number()),
		isMuted: v.boolean(),
		joinedAt: v.number(),
	})
		.index("by_conversation", ["conversationId"])
		.index("by_user", ["userId"])
		.index("by_user_conversation", ["userId", "conversationId"]),

	// ===========================================================================
	// MESSAGES
	// ===========================================================================
	messages: defineTable({
		conversationId: v.id("conversations"),
		senderId: v.string(),
		content: v.string(),
		type: v.union(v.literal("text"), v.literal("file"), v.literal("system")),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.string(),
					fileSize: v.number(),
				}),
			),
		),
		isEdited: v.optional(v.boolean()),
		isDeleted: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.optional(v.number()),
	})
		.index("by_conversation", ["conversationId", "createdAt"])
		.index("by_sender", ["senderId"]),

	// ===========================================================================
	// TYPING INDICATORS (éphémères)
	// ===========================================================================
	typingIndicators: defineTable({
		conversationId: v.id("conversations"),
		userId: v.string(),
		expiresAt: v.number(),
	})
		.index("by_conversation", ["conversationId"])
		.index("by_expires", ["expiresAt"]),

	// ===========================================================================
	// CALENDAR CONNECTIONS (OAuth tokens)
	// ===========================================================================
	calendarConnections: defineTable({
		userId: v.string(),
		provider: v.union(v.literal("google"), v.literal("microsoft")),
		accessToken: v.string(),
		refreshToken: v.string(),
		expiresAt: v.number(),
		email: v.optional(v.string()),
		isActive: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_user_provider", ["userId", "provider"]),

	// ===========================================================================
	// CALENDAR EVENTS
	// ===========================================================================
	calendarEvents: defineTable({
		source: v.union(v.literal("internal"), v.literal("google"), v.literal("microsoft")),
		externalId: v.optional(v.string()),
		connectionId: v.optional(v.id("calendarConnections")),
		title: v.string(),
		description: v.optional(v.string()),
		location: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		startAt: v.number(),
		endAt: v.number(),
		allDay: v.boolean(),
		createdById: v.string(),
		participants: v.optional(
			v.array(
				v.object({
					type: v.union(v.literal("team"), v.literal("client"), v.literal("external")),
					userId: v.optional(v.string()),
					clientId: v.optional(v.id("clients")),
					contactId: v.optional(v.id("contacts")),
					email: v.optional(v.string()),
					name: v.optional(v.string()),
					status: v.union(
						v.literal("pending"),
						v.literal("accepted"),
						v.literal("declined"),
						v.literal("tentative"),
					),
				}),
			),
		),
		color: v.optional(v.string()),
		syncStatus: v.optional(
			v.union(v.literal("synced"), v.literal("pending_push"), v.literal("conflict")),
		),
		lastSyncedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_date_range", ["startAt"])
		.index("by_creator", ["createdById"])
		.index("by_externalId", ["externalId", "source"])
		.index("by_connection", ["connectionId"]),

	// ===========================================================================
	// RATE LIMITS
	// ===========================================================================
	rateLimits: defineTable({
		action: v.string(),
		key: v.string(),
		lastAttempt: v.number(),
	}).index("by_action_key", ["action", "key"]),
})
