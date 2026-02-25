import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: { includeInactive: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const sops = await ctx.db.query("sops").collect()
		if (!args.includeInactive) return sops.filter((s) => s.isActive)
		return sops
	},
})

export const getById = query({
	args: { id: v.id("sops") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.get(args.id)
	},
})

export const create = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		contenu: v.string(),
		categorie: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "associe" && user.role !== "manager") throw new Error("Non autorisé")
		const now = Date.now()
		return ctx.db.insert("sops", {
			nom: args.nom,
			description: args.description,
			contenu: args.contenu,
			categorie: args.categorie,
			isActive: true,
			createdById: user.id as string,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("sops"),
		nom: v.optional(v.string()),
		description: v.optional(v.string()),
		contenu: v.optional(v.string()),
		categorie: v.optional(v.string()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "associe" && user.role !== "manager") throw new Error("Non autorisé")
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const remove = mutation({
	args: { id: v.id("sops") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "associe") throw new Error("Seul un associé peut supprimer une SOP")
		await ctx.db.delete(args.id)
	},
})
