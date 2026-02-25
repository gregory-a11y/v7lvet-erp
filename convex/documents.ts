import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent } from "./auth"

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		const docs = await ctx.db
			.query("documents")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()

		// Enrich with category name
		const enriched = await Promise.all(
			docs.map(async (d) => {
				let categorieName: string | undefined
				if (d.categorieId) {
					const cat = await ctx.db.get(d.categorieId)
					categorieName = cat?.nom
				}
				return { ...d, categorieName }
			}),
		)

		enriched.sort((a, b) => b.createdAt - a.createdAt)
		return enriched
	},
})

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		return await ctx.storage.generateUploadUrl()
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		categorieId: v.optional(v.id("documentCategories")),
		storageId: v.string(),
		mimeType: v.optional(v.string()),
		fileSize: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		return ctx.db.insert("documents", {
			...args,
			uploadedById: user.id as string,
			createdAt: Date.now(),
		})
	},
})

export const getDownloadUrl = query({
	args: { storageId: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null
		return await ctx.storage.getUrl(args.storageId as any)
	},
})

export const remove = mutation({
	args: { id: v.id("documents") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const doc = await ctx.db.get(args.id)
		if (doc) {
			await ctx.storage.delete(doc.storageId as any)
		}
		await ctx.db.delete(args.id)
	},
})

// Document categories
export const listCategories = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		return ctx.db.query("documentCategories").collect()
	},
})

export const createCategory = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")

		return ctx.db.insert("documentCategories", {
			...args,
			isActive: true,
			createdAt: Date.now(),
		})
	},
})

export const removeCategory = mutation({
	args: { id: v.id("documentCategories") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})
