import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { authComponent } from "./auth"

export const listByTache = query({
	args: { tacheId: v.id("taches") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		return ctx.db.query("gates").withIndex("by_tache", (q) => q.eq("tacheId", args.tacheId)).collect()
	},
})

export const listByRun = query({
	args: { runId: v.id("runs") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		return ctx.db.query("gates").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
	},
})

export const create = mutation({
	args: {
		tacheId: v.optional(v.id("taches")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		description: v.optional(v.string()),
		ordre: v.number(),
		preuveAttendue: v.optional(v.string()),
		validateurId: v.optional(v.string()),
		escaladeRegle: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const now = Date.now()
		return ctx.db.insert("gates", {
			...args,
			status: "a_valider",
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const validate = mutation({
	args: {
		id: v.id("gates"),
		commentaire: v.optional(v.string()),
		preuveUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		await ctx.db.patch(args.id, {
			status: "valide",
			validePar: user.id as string,
			valideAt: Date.now(),
			commentaire: args.commentaire,
			preuveUrl: args.preuveUrl,
			updatedAt: Date.now(),
		})
	},
})

export const reject = mutation({
	args: {
		id: v.id("gates"),
		commentaire: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		await ctx.db.patch(args.id, {
			status: "refuse",
			commentaire: args.commentaire,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("gates") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})

// Gate templates
export const listTemplates = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		return ctx.db.query("gateTemplates").collect()
	},
})

export const createTemplate = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		preuveAttendue: v.optional(v.string()),
		escaladeRegle: v.optional(v.string()),
		ordre: v.number(),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")

		return ctx.db.insert("gateTemplates", {
			...args,
			createdAt: Date.now(),
		})
	},
})

export const removeTemplate = mutation({
	args: { id: v.id("gateTemplates") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})
