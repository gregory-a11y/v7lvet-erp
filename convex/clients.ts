import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { authComponent } from "./auth"

export const list = query({
	args: {
		status: v.optional(v.string()),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		let clients: Doc<"clients">[]

		if (args.search && args.search.length > 0) {
			clients = await ctx.db
				.query("clients")
				.withSearchIndex("search_raison_sociale", (q) =>
					q.search("raisonSociale", args.search!),
				)
				.collect()
		} else if (args.status) {
			clients = await ctx.db
				.query("clients")
				.withIndex("by_status", (q) => q.eq("status", args.status as "actif" | "archive"))
				.collect()
		} else {
			clients = await ctx.db.query("clients").collect()
		}

		// Permission cascade
		if (user.role === "manager") {
			clients = clients.filter((c) => c.managerId === (user.id as string))
		} else if (user.role === "collaborateur") {
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
				.collect()
			const clientIds = new Set(dossiers.map((d) => d.clientId))
			clients = clients.filter((c) => clientIds.has(c._id))
		} else if (user.role === "assistante") {
			clients = []
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
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null

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
		formeJuridique: v.optional(v.string()),
		activite: v.optional(v.string()),
		categorieFiscale: v.optional(v.string()),
		regimeFiscal: v.optional(v.string()),
		regimeTVA: v.optional(v.string()),
		frequenceTVA: v.optional(v.string()),
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
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Seul un associé peut créer un client")

		const now = Date.now()
		const clientId = await ctx.db.insert("clients", {
			...args,
			formeJuridique: args.formeJuridique as any,
			activite: args.activite as any,
			categorieFiscale: args.categorieFiscale as any,
			regimeFiscal: args.regimeFiscal as any,
			regimeTVA: args.regimeTVA as any,
			frequenceTVA: args.frequenceTVA as any,
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
		formeJuridique: v.optional(v.string()),
		activite: v.optional(v.string()),
		categorieFiscale: v.optional(v.string()),
		regimeFiscal: v.optional(v.string()),
		regimeTVA: v.optional(v.string()),
		frequenceTVA: v.optional(v.string()),
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
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const client = await ctx.db.get(args.id)
		if (!client) throw new Error("Client non trouvé")

		if (user.role !== "associe" && client.managerId !== (user.id as string)) {
			throw new Error("Non autorisé")
		}

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			formeJuridique: updates.formeJuridique as any,
			activite: updates.activite as any,
			categorieFiscale: updates.categorieFiscale as any,
			regimeFiscal: updates.regimeFiscal as any,
			regimeTVA: updates.regimeTVA as any,
			frequenceTVA: updates.frequenceTVA as any,
			updatedAt: Date.now(),
		})
	},
})

export const archive = mutation({
	args: { id: v.id("clients") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Seul un associé peut archiver un client")

		await ctx.db.patch(args.id, {
			status: "archive",
			updatedAt: Date.now(),
		})
	},
})
