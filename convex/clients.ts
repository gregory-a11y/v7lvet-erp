import { v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const formeJuridiqueValidator = v.optional(
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
)

const activiteValidator = v.optional(
	v.union(
		v.literal("profession_liberale_medicale"),
		v.literal("autres_professions_liberales"),
		v.literal("commerciale_industrielle_artisanale"),
		v.literal("agricole"),
		v.literal("civile"),
	),
)

const categorieFiscaleValidator = v.optional(
	v.union(v.literal("IR-BNC"), v.literal("IR-BIC"), v.literal("IR-RF"), v.literal("IS")),
)

const regimeFiscalValidator = v.optional(
	v.union(
		v.literal("reel_normal"),
		v.literal("reel_simplifie"),
		v.literal("reel_complet"),
		v.literal("micro"),
	),
)

const regimeTVAValidator = v.optional(
	v.union(
		v.literal("franchise_en_base"),
		v.literal("reel_normal"),
		v.literal("rsi"),
		v.literal("exoneree"),
	),
)

const frequenceTVAValidator = v.optional(
	v.union(v.literal("mensuelle"), v.literal("trimestrielle"), v.literal("annuelle")),
)

export const list = query({
	args: {
		status: v.optional(v.string()),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		let clients: Doc<"clients">[]

		if (args.search && args.search.length > 0) {
			clients = await ctx.db
				.query("clients")
				.withSearchIndex("search_raison_sociale", (q) => q.search("raisonSociale", args.search!))
				.take(200)
		} else if (args.status) {
			clients = await ctx.db
				.query("clients")
				.withIndex("by_status", (q) => q.eq("status", args.status as "actif" | "archive"))
				.take(200)
		} else {
			clients = await ctx.db.query("clients").take(200)
		}

		// Permission cascade
		if (user.role === "manager") {
			clients = clients.filter((c) => c.managerId === (user.id as string))
		} else if (user.role === "collaborateur") {
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
				.take(500)
			const clientIds = new Set(dossiers.map((d) => d.clientId))
			clients = clients.filter((c) => clientIds.has(c._id))
		}

		// Filter by status if search was used (search doesn't filter by status)
		if (args.search && args.status) {
			clients = clients.filter((c) => c.status === args.status)
		}

		return clients
	},
})

export const getById = query({
	args: { id: v.id("clients") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const client = await ctx.db.get(args.id)
		if (!client) return null

		return client
	},
})

export const create = mutation({
	args: {
		raisonSociale: v.string(),
		siren: v.optional(v.string()),
		siret: v.optional(v.string()),
		adresseRue: v.optional(v.string()),
		adresseVille: v.optional(v.string()),
		adresseCodePostal: v.optional(v.string()),
		telephone: v.optional(v.string()),
		email: v.optional(v.string()),
		formeJuridique: formeJuridiqueValidator,
		activite: activiteValidator,
		categorieFiscale: categorieFiscaleValidator,
		regimeFiscal: regimeFiscalValidator,
		regimeTVA: regimeTVAValidator,
		frequenceTVA: frequenceTVAValidator,
		jourTVA: v.optional(v.number()),
		dateClotureComptable: v.optional(v.string()),
		caN1: v.optional(v.number()),
		paiementISUnique: v.optional(v.boolean()),
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
		notes: v.optional(v.string()),
		managerId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut créer un client")

		const now = Date.now()
		const clientId = await ctx.db.insert("clients", {
			...args,
			status: "actif",
			createdAt: now,
			updatedAt: now,
		})
		return clientId
	},
})

export const update = mutation({
	args: {
		id: v.id("clients"),
		raisonSociale: v.optional(v.string()),
		siren: v.optional(v.string()),
		siret: v.optional(v.string()),
		adresseRue: v.optional(v.string()),
		adresseVille: v.optional(v.string()),
		adresseCodePostal: v.optional(v.string()),
		telephone: v.optional(v.string()),
		email: v.optional(v.string()),
		formeJuridique: formeJuridiqueValidator,
		activite: activiteValidator,
		categorieFiscale: categorieFiscaleValidator,
		regimeFiscal: regimeFiscalValidator,
		regimeTVA: regimeTVAValidator,
		frequenceTVA: frequenceTVAValidator,
		jourTVA: v.optional(v.number()),
		dateClotureComptable: v.optional(v.string()),
		caN1: v.optional(v.number()),
		paiementISUnique: v.optional(v.boolean()),
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
		notes: v.optional(v.string()),
		managerId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const client = await ctx.db.get(args.id)
		if (!client) throw new Error("Client non trouvé")

		if (user.role !== "admin" && client.managerId !== user.id) {
			throw new Error("Non autorisé")
		}

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		})
	},
})

export const archive = mutation({
	args: { id: v.id("clients") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut archiver un client")

		await ctx.db.patch(args.id, {
			status: "archive",
			updatedAt: Date.now(),
		})
	},
})
