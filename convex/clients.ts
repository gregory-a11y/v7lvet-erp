import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { internalMutation, mutation, query } from "./_generated/server"
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
		dividendes: v.optional(v.boolean()),
		datePaiementDividendes: v.optional(v.string()),
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
		dividendes: v.optional(v.boolean()),
		datePaiementDividendes: v.optional(v.string()),
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

async function performCascadeDelete(ctx: MutationCtx, clientId: Id<"clients">) {
	// Gates (via taches)
	const taches = await ctx.db
		.query("taches")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const tache of taches) {
		const gates = await ctx.db
			.query("gates")
			.withIndex("by_tache", (q) => q.eq("tacheId", tache._id))
			.collect()
		for (const gate of gates) await ctx.db.delete(gate._id)
		await ctx.db.delete(tache._id)
	}

	// Runs + their gates
	const runs = await ctx.db
		.query("runs")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const run of runs) {
		const runGates = await ctx.db
			.query("gates")
			.withIndex("by_run", (q) => q.eq("runId", run._id))
			.collect()
		for (const g of runGates) await ctx.db.delete(g._id)
		await ctx.db.delete(run._id)
	}

	// Dossiers
	const dossiers = await ctx.db
		.query("dossiers")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const d of dossiers) await ctx.db.delete(d._id)

	// Contacts
	const contacts = await ctx.db
		.query("contacts")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const c of contacts) await ctx.db.delete(c._id)

	// Tickets
	const tickets = await ctx.db
		.query("tickets")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const t of tickets) await ctx.db.delete(t._id)

	// Documents
	const documents = await ctx.db
		.query("documents")
		.withIndex("by_client", (q) => q.eq("clientId", clientId))
		.collect()
	for (const doc of documents) await ctx.db.delete(doc._id)

	// Client itself
	await ctx.db.delete(clientId)
}

/**
 * Cascade delete: removes a client and ALL related data.
 * Internal only — callable from scheduled jobs or admin actions.
 */
export const cascadeDelete = internalMutation({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		await performCascadeDelete(ctx, args.clientId)
	},
})

/**
 * Admin-only: permanently delete a client and all related data.
 */
export const remove = mutation({
	args: { id: v.id("clients") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer un client")

		const client = await ctx.db.get(args.id)
		if (!client) throw new Error("Client introuvable")

		await performCascadeDelete(ctx, args.id)
	},
})
