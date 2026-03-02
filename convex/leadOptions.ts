import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const CATEGORY = v.union(v.literal("source"), v.literal("type"), v.literal("prestation"))

// ─── Queries ────────────────────────────────────────────────────────────────

export const list = query({
	args: {
		category: v.optional(CATEGORY),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		if (args.category) {
			return ctx.db
				.query("leadOptions")
				.withIndex("by_category_active", (q) =>
					q.eq("category", args.category!).eq("isActive", true),
				)
				.collect()
				.then((opts) => opts.sort((a, b) => a.order - b.order))
		}
		const all = await ctx.db
			.query("leadOptions")
			.filter((q) => q.eq(q.field("isActive"), true))
			.collect()
		return all.sort((a, b) => {
			if (a.category !== b.category) return a.category.localeCompare(b.category)
			return a.order - b.order
		})
	},
})

export const listAll = query({
	args: {
		category: v.optional(CATEGORY),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		if (args.category) {
			return ctx.db
				.query("leadOptions")
				.withIndex("by_category", (q) => q.eq("category", args.category!))
				.collect()
				.then((opts) => opts.sort((a, b) => a.order - b.order))
		}
		const all = await ctx.db.query("leadOptions").collect()
		return all.sort((a, b) => {
			if (a.category !== b.category) return a.category.localeCompare(b.category)
			return a.order - b.order
		})
	},
})

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = mutation({
	args: {
		category: CATEGORY,
		value: v.string(),
		label: v.string(),
		color: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")

		const existing = await ctx.db
			.query("leadOptions")
			.withIndex("by_category", (q) => q.eq("category", args.category))
			.collect()

		const duplicate = existing.find((o) => o.value === args.value)
		if (duplicate) throw new Error(`L'option "${args.value}" existe déjà`)

		const maxOrder = existing.reduce((max, o) => Math.max(max, o.order), 0)

		return ctx.db.insert("leadOptions", {
			category: args.category,
			value: args.value,
			label: args.label,
			color: args.color,
			order: maxOrder + 1,
			isDefault: false,
			isActive: true,
			createdAt: Date.now(),
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("leadOptions"),
		label: v.optional(v.string()),
		color: v.optional(v.string()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		const { id, ...updates } = args
		await ctx.db.patch(id, updates)
	},
})

export const remove = mutation({
	args: { id: v.id("leadOptions") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		await ctx.db.patch(args.id, { isActive: false })
	},
})

export const reorder = mutation({
	args: {
		ids: v.array(v.id("leadOptions")),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		for (let i = 0; i < args.ids.length; i++) {
			await ctx.db.patch(args.ids[i], { order: i + 1 })
		}
	},
})

export const seed = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")

		const existing = await ctx.db.query("leadOptions").collect()
		if (existing.length > 0) return { seeded: false, message: "Options déjà existantes" }

		const now = Date.now()

		const defaults: Array<{
			category: "source" | "type" | "prestation"
			value: string
			label: string
			color?: string
		}> = [
			// Sources
			{ category: "source", value: "recommandation", label: "Recommandation", color: "#22c55e" },
			{ category: "source", value: "site_web", label: "Site web", color: "#3b82f6" },
			{ category: "source", value: "formulaire", label: "Formulaire", color: "#8b5cf6" },
			{ category: "source", value: "reseau", label: "Réseau", color: "#f59e0b" },
			{ category: "source", value: "salon", label: "Salon", color: "#ec4899" },
			{ category: "source", value: "parrainage", label: "Parrainage", color: "#14b8a6" },
			{ category: "source", value: "autre", label: "Autre", color: "#6b7280" },
			// Types
			{ category: "type", value: "creation", label: "Création", color: "#3b82f6" },
			{ category: "type", value: "reprise", label: "Reprise", color: "#22c55e" },
			{
				category: "type",
				value: "changement_comptable",
				label: "Changement comptable",
				color: "#f59e0b",
			},
			{
				category: "type",
				value: "mission_complementaire",
				label: "Mission complémentaire",
				color: "#8b5cf6",
			},
			{ category: "type", value: "autre", label: "Autre", color: "#6b7280" },
			// Prestations
			{ category: "prestation", value: "comptabilite", label: "Comptabilité", color: "#3b82f6" },
			{ category: "prestation", value: "social_paie", label: "Social / Paie", color: "#22c55e" },
			{ category: "prestation", value: "juridique", label: "Juridique", color: "#f59e0b" },
			{ category: "prestation", value: "fiscal", label: "Fiscal", color: "#ef4444" },
			{ category: "prestation", value: "conseil", label: "Conseil", color: "#8b5cf6" },
			{
				category: "prestation",
				value: "creation_entreprise",
				label: "Création d'entreprise",
				color: "#14b8a6",
			},
			{ category: "prestation", value: "audit", label: "Audit", color: "#ec4899" },
			{ category: "prestation", value: "autre", label: "Autre", color: "#6b7280" },
		]

		const order = { source: 0, type: 0, prestation: 0 }
		for (const opt of defaults) {
			order[opt.category]++
			await ctx.db.insert("leadOptions", {
				category: opt.category,
				value: opt.value,
				label: opt.label,
				color: opt.color,
				order: order[opt.category],
				isDefault: true,
				isActive: true,
				createdAt: now,
			})
		}

		return { seeded: true, count: defaults.length }
	},
})
