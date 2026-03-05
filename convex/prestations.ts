import { v } from "convex/values"
import { internalQuery, mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

// ─── Queries ────────────────────────────────────────────────────────────────

/** List active prestations (for selectors) */
export const list = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		const all = await ctx.db
			.query("prestations")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect()
		return all.sort((a, b) => a.order - b.order)
	},
})

/** List all prestations including archived (admin) */
export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		const all = await ctx.db.query("prestations").collect()
		return all.sort((a, b) => a.order - b.order)
	},
})

export const getById = query({
	args: { id: v.id("prestations") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.get(args.id)
	},
})

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = mutation({
	args: {
		titre: v.string(),
		description: v.optional(v.string()),
		items: v.array(v.object({ nom: v.string(), description: v.optional(v.string()) })),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")

		const all = await ctx.db.query("prestations").collect()
		const maxOrder = all.reduce((max, p) => Math.max(max, p.order), 0)

		const now = Date.now()
		return ctx.db.insert("prestations", {
			titre: args.titre,
			description: args.description,
			items: args.items,
			isActive: true,
			order: maxOrder + 1,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("prestations"),
		titre: v.optional(v.string()),
		description: v.optional(v.string()),
		items: v.optional(v.array(v.object({ nom: v.string(), description: v.optional(v.string()) }))),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")

		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const archive = mutation({
	args: { id: v.id("prestations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() })
	},
})

export const reactivate = mutation({
	args: { id: v.id("prestations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		await ctx.db.patch(args.id, { isActive: true, updatedAt: Date.now() })
	},
})

export const reorder = mutation({
	args: { ids: v.array(v.id("prestations")) },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Admin uniquement")
		for (let i = 0; i < args.ids.length; i++) {
			await ctx.db.patch(args.ids[i], { order: i + 1 })
		}
	},
})

// ─── Internal ───────────────────────────────────────────────────────────────

/** Lookup prestations by title strings (case-insensitive). Returns matching IDs. */
export const lookupByTitles = internalQuery({
	args: { titles: v.array(v.string()) },
	handler: async (ctx, args) => {
		const all = await ctx.db
			.query("prestations")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect()
		const lowerTitles = args.titles.map((t) => t.toLowerCase())
		return all.filter((p) => lowerTitles.includes(p.titre.toLowerCase())).map((p) => p._id)
	},
})
