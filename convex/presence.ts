import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent } from "./auth"

const ONLINE_THRESHOLD_MS = 60_000 // 60 seconds

export const heartbeat = mutation({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return
		const userId = (user._id as string) || (user.id as string)

		const existing = await ctx.db
			.query("presence")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()

		if (existing) {
			await ctx.db.patch(existing._id, { lastSeen: Date.now() })
		} else {
			await ctx.db.insert("presence", { userId, lastSeen: Date.now() })
		}
	},
})

export const listOnline = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		const allPresence = await ctx.db.query("presence").collect()
		const now = Date.now()

		return allPresence.map((p) => ({
			userId: p.userId,
			isOnline: now - p.lastSeen < ONLINE_THRESHOLD_MS,
			lastSeen: p.lastSeen,
		}))
	},
})

export const isUserOnline = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return false

		const presence = await ctx.db
			.query("presence")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()

		if (!presence) return false
		return Date.now() - presence.lastSeen < ONLINE_THRESHOLD_MS
	},
})
