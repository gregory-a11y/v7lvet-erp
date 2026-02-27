import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"
import { evaluateRules } from "./fiscalEngine"

// ─── Validators ──────────────────────────────────────────────────────────────

const conditionValidator = v.object({
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

const taskValidator = v.object({
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

const branchValidator = v.object({
	nom: v.string(),
	conditions: v.array(conditionValidator),
	taches: v.array(taskValidator),
})

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}
		const rules = await ctx.db.query("fiscalRules").withIndex("by_ordre").collect()
		return rules
	},
})

export const getById = query({
	args: { id: v.id("fiscalRules") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}
		return ctx.db.get(args.id)
	},
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		isActive: v.boolean(),
		ordre: v.number(),
		conditions: v.array(conditionValidator),
		branches: v.array(branchValidator),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const now = Date.now()
		return ctx.db.insert("fiscalRules", {
			...args,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("fiscalRules"),
		nom: v.optional(v.string()),
		description: v.optional(v.string()),
		isActive: v.optional(v.boolean()),
		ordre: v.optional(v.number()),
		conditions: v.optional(v.array(conditionValidator)),
		branches: v.optional(v.array(branchValidator)),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const { id, ...updates } = args
		const existing = await ctx.db.get(id)
		if (!existing) throw new Error("Règle non trouvée")

		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("fiscalRules") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.get(args.id)
		if (!existing) throw new Error("Règle non trouvée")

		await ctx.db.delete(args.id)
	},
})

export const toggleActive = mutation({
	args: { id: v.id("fiscalRules") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.get(args.id)
		if (!existing) throw new Error("Règle non trouvée")

		await ctx.db.patch(args.id, {
			isActive: !existing.isActive,
			updatedAt: Date.now(),
		})
	},
})

export const duplicate = mutation({
	args: { id: v.id("fiscalRules") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.get(args.id)
		if (!existing) throw new Error("Règle non trouvée")

		const now = Date.now()
		const { _id, _creationTime, ...rest } = existing
		return ctx.db.insert("fiscalRules", {
			...rest,
			nom: `${rest.nom} (copie)`,
			isActive: false,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const reorder = mutation({
	args: {
		updates: v.array(
			v.object({
				id: v.id("fiscalRules"),
				ordre: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const now = Date.now()
		await Promise.all(
			args.updates.map((u) => ctx.db.patch(u.id, { ordre: u.ordre, updatedAt: now })),
		)
	},
})

// ─── Preview (query, not action — evaluateRules is pure) ─────────────────────

export const preview = query({
	args: {
		clientId: v.id("clients"),
		exercice: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client non trouvé")

		const rules = await ctx.db
			.query("fiscalRules")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect()

		return evaluateRules(client, args.exercice, rules)
	},
})
