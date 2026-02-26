import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const STATUT = v.union(
	v.literal("prospect"),
	v.literal("contact"),
	v.literal("proposition"),
	v.literal("negociation"),
	v.literal("gagne"),
	v.literal("perdu"),
)

const SOURCE = v.union(
	v.literal("recommandation"),
	v.literal("reseau"),
	v.literal("site_web"),
	v.literal("salon"),
	v.literal("autre"),
)

export const list = query({
	args: { statut: v.optional(v.string()), responsableId: v.optional(v.string()) },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const q = ctx.db.query("opportunites")
		if (args.statut) {
			return q.withIndex("by_statut", (qi) => qi.eq("statut", args.statut as any)).collect()
		}
		return q.collect()
	},
})

export const getById = query({
	args: { id: v.id("opportunites") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.get(args.id)
	},
})

export const create = mutation({
	args: {
		nom: v.string(),
		statut: STATUT,
		source: v.optional(SOURCE),
		contactNom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
		responsableId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const now = Date.now()
		return ctx.db.insert("opportunites", { ...args, createdAt: now, updatedAt: now })
	},
})

export const update = mutation({
	args: {
		id: v.id("opportunites"),
		nom: v.optional(v.string()),
		statut: v.optional(STATUT),
		source: v.optional(SOURCE),
		contactNom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
		responsableId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const remove = mutation({
	args: { id: v.id("opportunites") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})

export const stats = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		const all = await ctx.db.query("opportunites").collect()

		const byStatut: Record<string, number> = {}
		let totalMontant = 0
		let gagnes = 0

		for (const opp of all) {
			byStatut[opp.statut] = (byStatut[opp.statut] ?? 0) + 1
			if (opp.montantEstime) totalMontant += opp.montantEstime
			if (opp.statut === "gagne") gagnes++
		}

		const closed = gagnes + (byStatut.perdu ?? 0)
		const tauxConversion = closed > 0 ? Math.round((gagnes / closed) * 100) : 0

		return {
			total: all.length,
			byStatut,
			totalMontant,
			tauxConversion,
			recent: all.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
		}
	},
})

export const convertToClient = mutation({
	args: {
		id: v.id("opportunites"),
		raisonSociale: v.string(),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const opp = await ctx.db.get(args.id)
		if (!opp) throw new Error("Opportunité introuvable")

		const now = Date.now()
		const clientId = await ctx.db.insert("clients", {
			raisonSociale: args.raisonSociale,
			email: opp.contactEmail,
			status: "actif",
			createdAt: now,
			updatedAt: now,
		})

		await ctx.db.patch(args.id, {
			statut: "gagne",
			clientId,
			updatedAt: now,
		})

		return clientId
	},
})
