import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { authComponent, getAuthUserWithRole } from "./auth"

export const setTyping = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const expiresAt = Date.now() + 5000

		const existing = await ctx.db
			.query("typingIndicators")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.collect()

		const mine = existing.find((t) => t.userId === user.id)
		if (mine) {
			await ctx.db.patch(mine._id, { expiresAt })
		} else {
			await ctx.db.insert("typingIndicators", {
				conversationId: args.conversationId,
				userId: user.id,
				expiresAt,
			})
		}
	},
})

export const clearTyping = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const indicators = await ctx.db
			.query("typingIndicators")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.collect()

		const mine = indicators.find((t) => t.userId === user.id)
		if (mine) {
			await ctx.db.delete(mine._id)
		}
	},
})

export const getTyping = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		const userId = (user._id as string) || (user.id as string)

		const now = Date.now()
		const indicators = await ctx.db
			.query("typingIndicators")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.collect()

		const active = indicators.filter((t) => t.expiresAt > now && t.userId !== userId)

		const enriched = await Promise.all(
			active.map(async (t) => {
				const profile = await ctx.db
					.query("userProfiles")
					.withIndex("by_userId", (q) => q.eq("userId", t.userId))
					.first()
				return {
					userId: t.userId,
					nom: profile?.nom ?? null,
				}
			}),
		)

		return enriched
	},
})

export const cleanupExpired = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const expired = await ctx.db.query("typingIndicators").withIndex("by_expires").collect()

		for (const indicator of expired) {
			if (indicator.expiresAt <= now) {
				await ctx.db.delete(indicator._id)
			}
		}
	},
})
