import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent } from "./auth"

export const listForUser = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", user.id as string))
			.collect()

		notifications.sort((a, b) => b.createdAt - a.createdAt)
		return notifications
	},
})

export const unreadCount = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return 0

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", user.id as string).eq("isRead", false))
			.collect()

		return unread.length
	},
})

export const markAsRead = mutation({
	args: { id: v.id("notifications") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifie")

		await ctx.db.patch(args.id, { isRead: true })
	},
})

export const markAllAsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifie")

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", user.id as string).eq("isRead", false))
			.collect()

		await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })))
	},
})

export const create = mutation({
	args: {
		userId: v.string(),
		type: v.union(
			v.literal("echeance_proche"),
			v.literal("echeance_depassee"),
			v.literal("ticket_cree"),
			v.literal("tache_assignee"),
		),
		titre: v.string(),
		message: v.string(),
		lien: v.optional(v.string()),
		relatedId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifie")

		return ctx.db.insert("notifications", {
			userId: args.userId,
			type: args.type,
			titre: args.titre,
			message: args.message,
			lien: args.lien,
			relatedId: args.relatedId,
			isRead: false,
			createdAt: Date.now(),
		})
	},
})
