import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		const _user = await getAuthUserWithRole(ctx)

		const docs = await ctx.db.query("documents").order("desc").take(200)

		// Batch-fetch clients and categories (avoid N+1)
		const uniqueClientIds = [...new Set(docs.map((d) => d.clientId))]
		const uniqueCatIds = [...new Set(docs.filter((d) => d.categorieId).map((d) => d.categorieId!))]

		const [clients, categories] = await Promise.all([
			Promise.all(uniqueClientIds.map((id) => ctx.db.get(id))),
			Promise.all(uniqueCatIds.map((id) => ctx.db.get(id))),
		])

		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))
		const catMap = new Map(categories.filter(Boolean).map((c) => [c!._id, c!.nom]))

		const enriched = docs.map((d) => ({
			...d,
			clientName: clientMap.get(d.clientId) ?? "—",
			categorieName: d.categorieId ? catMap.get(d.categorieId) : undefined,
		}))

		return enriched
	},
})

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

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
		const _user = await getAuthUserWithRole(ctx)
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
		const user = await getAuthUserWithRole(ctx)

		return ctx.db.insert("documents", {
			...args,
			uploadedById: user.id as string,
			createdAt: Date.now(),
		})
	},
})

export const listByRun = query({
	args: { runId: v.id("runs") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const docs = await ctx.db
			.query("documents")
			.withIndex("by_run", (q) => q.eq("runId", args.runId))
			.collect()

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

		return enriched.sort((a, b) => b.createdAt - a.createdAt)
	},
})

export const getDownloadUrl = query({
	args: { storageId: v.string() },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)
		return await ctx.storage.getUrl(args.storageId as any)
	},
})

export const remove = mutation({
	args: { id: v.id("documents") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent supprimer un document")
		}

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
		const _user = await getAuthUserWithRole(ctx)
		return ctx.db.query("documentCategories").collect()
	},
})

export const createCategory = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

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
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})
