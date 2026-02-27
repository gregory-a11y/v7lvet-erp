import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const DEFAULT_CATEGORIES = [
	{ nom: "Fiscalité", slug: "fiscalite", color: "#2E6965" },
	{ nom: "Comptabilité", slug: "comptabilite", color: "#063238" },
	{ nom: "Social / Paie", slug: "social-paie", color: "#6242FB" },
	{ nom: "Juridique", slug: "juridique", color: "#D97706" },
	{ nom: "Gestion interne", slug: "gestion-interne", color: "#6B7280" },
	{ nom: "Commercial", slug: "commercial", color: "#059669" },
	{ nom: "Informatique", slug: "informatique", color: "#7C3AED" },
] as const

export const list = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.db
			.query("sopCategories")
			.filter((q) => q.eq(q.field("isActive"), true))
			.collect()
	},
})

export const create = mutation({
	args: {
		nom: v.string(),
		slug: v.string(),
		color: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")
		const existing = await ctx.db
			.query("sopCategories")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first()
		if (existing) throw new Error("Une catégorie avec ce slug existe déjà")
		return ctx.db.insert("sopCategories", {
			nom: args.nom,
			slug: args.slug,
			color: args.color,
			isDefault: false,
			isActive: true,
			createdAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("sopCategories") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer une catégorie")
		const cat = await ctx.db.get(args.id)
		if (!cat) throw new Error("Catégorie introuvable")
		if (cat.isDefault) throw new Error("Impossible de supprimer une catégorie par défaut")
		await ctx.db.patch(args.id, { isActive: false })
	},
})

export const seed = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")
		let created = 0
		for (const cat of DEFAULT_CATEGORIES) {
			const existing = await ctx.db
				.query("sopCategories")
				.withIndex("by_slug", (q) => q.eq("slug", cat.slug))
				.first()
			if (!existing) {
				await ctx.db.insert("sopCategories", {
					nom: cat.nom,
					slug: cat.slug,
					color: cat.color,
					isDefault: true,
					isActive: true,
					createdAt: Date.now(),
				})
				created++
			}
		}
		return { created }
	},
})
