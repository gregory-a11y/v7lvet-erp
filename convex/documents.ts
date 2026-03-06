import { v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { canAccessClient, getAuthUserWithRole, safeGetAuthUserWithRole } from "./auth"
import { ALLOWED_DOC_MIMES, MAX_FILE_SIZE, validateFile } from "./uploadValidation"

export const list = query({
	args: {
		filter: v.optional(v.union(v.literal("all"), v.literal("cabinet"), v.literal("client"))),
	},
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []
		const filter = args.filter ?? "all"

		let docs = await ctx.db.query("documents").order("desc").take(200)

		// Permission cascade: restrict documents based on accessible clients
		if (user.role === "manager") {
			const accessibleClientIds = new Set(
				(await ctx.db.query("clients").take(500))
					.filter(
						(c) =>
							c.responsableOperationnelId === (user.id as string) ||
							c.responsableHierarchiqueId === (user.id as string),
					)
					.map((c) => c._id),
			)
			docs = docs.filter((d) => !d.clientId || accessibleClientIds.has(d.clientId))
		} else if (user.role === "collaborateur") {
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
				.take(500)
			const accessibleClientIds = new Set(dossiers.map((d) => d.clientId))
			docs = docs.filter((d) => !d.clientId || accessibleClientIds.has(d.clientId))
		}

		const filtered =
			filter === "cabinet"
				? docs.filter((d) => !d.clientId)
				: filter === "client"
					? docs.filter((d) => !!d.clientId)
					: docs

		// Batch-fetch clients and categories (avoid N+1)
		const uniqueClientIds = [...new Set(filtered.filter((d) => d.clientId).map((d) => d.clientId!))]
		const uniqueCatIds = [
			...new Set(filtered.filter((d) => d.categorieId).map((d) => d.categorieId!)),
		]

		const [clients, categories] = await Promise.all([
			Promise.all(uniqueClientIds.map((id) => ctx.db.get(id))),
			Promise.all(uniqueCatIds.map((id) => ctx.db.get(id))),
		])

		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))
		const catMap = new Map(categories.filter(Boolean).map((c) => [c!._id, c!.nom]))

		const enriched = filtered.map((d) => ({
			...d,
			clientName: d.clientId ? (clientMap.get(d.clientId) ?? "—") : null,
			categorieName: d.categorieId ? catMap.get(d.categorieId) : undefined,
		}))

		return enriched
	},
})

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		if (!(await canAccessClient(ctx, user, args.clientId))) return []

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

const fileEntryValidator = v.object({
	storageId: v.string(),
	nom: v.string(),
	mimeType: v.optional(v.string()),
	fileSize: v.optional(v.number()),
	uploadedAt: v.number(),
})

export const create = mutation({
	args: {
		clientId: v.optional(v.id("clients")),
		dossierId: v.optional(v.id("dossiers")),
		runId: v.optional(v.id("runs")),
		nom: v.string(),
		description: v.optional(v.string()),
		categorieId: v.optional(v.id("documentCategories")),
		storageId: v.string(),
		mimeType: v.optional(v.string()),
		fileSize: v.optional(v.number()),
		files: v.optional(v.array(fileEntryValidator)),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		if (args.clientId && !(await canAccessClient(ctx, user, args.clientId))) {
			throw new Error("Non autorisé")
		}

		validateFile(args.mimeType, args.fileSize, ALLOWED_DOC_MIMES, MAX_FILE_SIZE)

		const docId = await ctx.db.insert("documents", {
			...args,
			uploadedById: user.id as string,
			createdAt: Date.now(),
		})

		await ctx.scheduler.runAfter(0, internal.auditLog.record, {
			userId: user.id as string,
			action: "create",
			resource: "document",
			resourceId: docId,
			details: args.nom,
		})

		return docId
	},
})

export const addFiles = mutation({
	args: {
		id: v.id("documents"),
		files: v.array(fileEntryValidator),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé")
		}

		const doc = await ctx.db.get(args.id)
		if (!doc) throw new Error("Document introuvable")

		const existing = doc.files ?? []
		await ctx.db.patch(args.id, {
			files: [...existing, ...args.files],
		})
	},
})

export const listByRun = query({
	args: { runId: v.id("runs") },
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		// Check access via the run's client
		const run = await ctx.db.get(args.runId)
		if (!run || !(await canAccessClient(ctx, user, run.clientId))) return []

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
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null

		// Verify the user has access to the document's client
		// Check main storageId first
		let doc = await ctx.db
			.query("documents")
			.filter((q) => q.eq(q.field("storageId"), args.storageId))
			.first()

		// If not found as main storageId, search in files array
		if (!doc) {
			const allDocs = await ctx.db.query("documents").take(500)
			doc = allDocs.find((d) => d.files?.some((f) => f.storageId === args.storageId)) ?? null
		}

		if (doc?.clientId && !(await canAccessClient(ctx, user, doc.clientId))) return null

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
			if (doc.files) {
				for (const file of doc.files) {
					await ctx.storage.delete(file.storageId as any)
				}
			}
		}
		await ctx.scheduler.runAfter(0, internal.auditLog.record, {
			userId: user.id as string,
			action: "delete",
			resource: "document",
			resourceId: args.id,
			details: doc?.nom,
		})

		await ctx.db.delete(args.id)
	},
})

export const removeFile = mutation({
	args: {
		id: v.id("documents"),
		storageId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé")
		}

		const doc = await ctx.db.get(args.id)
		if (!doc) throw new Error("Document introuvable")

		await ctx.storage.delete(args.storageId as any)
		const updated = (doc.files ?? []).filter((f) => f.storageId !== args.storageId)
		await ctx.db.patch(args.id, { files: updated })
	},
})

// Document categories
export const listCategories = query({
	args: {},
	handler: async (ctx) => {
		if (!(await safeGetAuthUserWithRole(ctx))) return []
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
