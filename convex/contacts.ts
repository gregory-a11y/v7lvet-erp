import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent } from "./auth"

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		return ctx.db
			.query("contacts")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		nom: v.string(),
		prenom: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		fonction: v.optional(v.string()),
		isPrincipal: v.boolean(),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		// If marking as principal, unmark others
		if (args.isPrincipal) {
			const existing = await ctx.db
				.query("contacts")
				.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
				.collect()
			for (const contact of existing) {
				if (contact.isPrincipal) {
					await ctx.db.patch(contact._id, { isPrincipal: false })
				}
			}
		}

		return ctx.db.insert("contacts", args)
	},
})

export const update = mutation({
	args: {
		id: v.id("contacts"),
		nom: v.optional(v.string()),
		prenom: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		fonction: v.optional(v.string()),
		isPrincipal: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const contact = await ctx.db.get(args.id)
		if (!contact) throw new Error("Contact non trouvé")

		// If marking as principal, unmark others
		if (args.isPrincipal) {
			const existing = await ctx.db
				.query("contacts")
				.withIndex("by_client", (q) => q.eq("clientId", contact.clientId))
				.collect()
			for (const c of existing) {
				if (c._id !== args.id && c.isPrincipal) {
					await ctx.db.patch(c._id, { isPrincipal: false })
				}
			}
		}

		const { id, ...updates } = args
		await ctx.db.patch(id, updates)
	},
})

export const remove = mutation({
	args: { id: v.id("contacts") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		await ctx.db.delete(args.id)
	},
})
