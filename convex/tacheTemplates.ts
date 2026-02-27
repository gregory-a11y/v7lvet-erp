import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: { includeInactive: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const templates = await ctx.db.query("tacheTemplates").collect()
		if (!args.includeInactive) return templates.filter((t) => t.isActive)
		return templates
	},
})

export const getById = query({
	args: { id: v.id("tacheTemplates") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.get(args.id)
	},
})

export const create = mutation({
	args: {
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
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")
		const now = Date.now()
		return ctx.db.insert("tacheTemplates", {
			...args,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("tacheTemplates"),
		nom: v.optional(v.string()),
		description: v.optional(v.string()),
		categorie: v.optional(v.string()),
		sousCategorie: v.optional(v.string()),
		frequence: v.optional(
			v.union(
				v.literal("ponctuelle"),
				v.literal("mensuelle"),
				v.literal("trimestrielle"),
				v.literal("annuelle"),
			),
		),
		sopId: v.optional(v.id("sops")),
		estimationHeures: v.optional(v.number()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const remove = mutation({
	args: { id: v.id("tacheTemplates") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer un template")
		await ctx.db.delete(args.id)
	},
})

export const applyToRun = mutation({
	args: {
		templateId: v.id("tacheTemplates"),
		runId: v.id("runs"),
		clientId: v.id("clients"),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent appliquer un template")
		}
		const template = await ctx.db.get(args.templateId)
		if (!template) throw new Error("Template introuvable")

		const existing = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", args.runId))
			.collect()

		const now = Date.now()
		return ctx.db.insert("taches", {
			runId: args.runId,
			clientId: args.clientId,
			nom: template.nom,
			type: "operationnelle",
			status: "a_venir",
			categorie: template.categorie,
			sopId: template.sopId,
			dateEcheance: args.dateEcheance,
			assigneId: args.assigneId,
			order: existing.length + 1,
			createdAt: now,
			updatedAt: now,
		})
	},
})
