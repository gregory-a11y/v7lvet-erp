import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

export const findByHash = internalQuery({
	args: { keyHash: v.string() },
	handler: async (ctx, args) => {
		const key = await ctx.db
			.query("apiKeys")
			.withIndex("by_keyHash", (q) => q.eq("keyHash", args.keyHash))
			.first()
		if (!key || !key.isActive) return null
		return key
	},
})

export const markUsed = internalMutation({
	args: { id: v.id("apiKeys") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { lastUsedAt: Date.now() })
	},
})
