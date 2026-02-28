import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"
import { ALLOWED_DOC_MIMES, MAX_FILE_SIZE, validateAttachments } from "./uploadValidation"

export const list = query({
	args: { includeInactive: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const sops = await ctx.db.query("sops").collect()
		const filtered = args.includeInactive ? sops : sops.filter((s) => s.isActive)
		// Enrich with category info
		const enriched = await Promise.all(
			filtered.map(async (sop) => {
				let category = null
				if (sop.categorieId) {
					category = await ctx.db.get(sop.categorieId)
				}
				return {
					...sop,
					categoryNom: category?.nom ?? sop.categorie ?? null,
					categoryColor: category?.color ?? null,
					categorySlug: category?.slug ?? null,
				}
			}),
		)
		return enriched
	},
})

export const getById = query({
	args: { id: v.id("sops") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const sop = await ctx.db.get(args.id)
		if (!sop) return null
		let category = null
		if (sop.categorieId) {
			category = await ctx.db.get(sop.categorieId)
		}
		return {
			...sop,
			categoryNom: category?.nom ?? sop.categorie ?? null,
			categoryColor: category?.color ?? null,
			categorySlug: category?.slug ?? null,
		}
	},
})

export const create = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		contenu: v.string(),
		categorieId: v.optional(v.id("sopCategories")),
		videoUrl: v.optional(v.string()),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.string(),
					fileSize: v.number(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")

		validateAttachments(args.attachments, ALLOWED_DOC_MIMES, MAX_FILE_SIZE)

		const now = Date.now()
		return ctx.db.insert("sops", {
			nom: args.nom,
			description: args.description,
			contenu: args.contenu,
			categorieId: args.categorieId,
			videoUrl: args.videoUrl,
			attachments: args.attachments,
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
		categorieId: v.optional(v.id("sopCategories")),
		videoUrl: v.optional(v.string()),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.string(),
					fileSize: v.number(),
				}),
			),
		),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")

		validateAttachments(args.attachments, ALLOWED_DOC_MIMES, MAX_FILE_SIZE)

		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const remove = mutation({
	args: { id: v.id("sops") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer une SOP")
		const sop = await ctx.db.get(args.id)
		if (sop?.attachments) {
			for (const att of sop.attachments) {
				try {
					await ctx.storage.delete(att.storageId as any)
				} catch {
					// Storage file may already be deleted
				}
			}
		}
		await ctx.db.delete(args.id)
	},
})

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return await ctx.storage.generateUploadUrl()
	},
})

export const getFileUrl = query({
	args: { storageId: v.string() },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return await ctx.storage.getUrl(args.storageId as any)
	},
})
