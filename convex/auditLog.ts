import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

/**
 * Records an audit log entry. Called from other Convex functions.
 */
export const record = internalMutation({
	args: {
		userId: v.string(),
		action: v.string(),
		resource: v.string(),
		resourceId: v.optional(v.string()),
		details: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("auditLogs", {
			userId: args.userId,
			action: args.action,
			resource: args.resource,
			resourceId: args.resourceId,
			details: args.details,
			createdAt: Date.now(),
		})
	},
})

/**
 * List audit logs (admin only).
 */
export const list = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès refusé")

		return ctx.db
			.query("auditLogs")
			.withIndex("by_createdAt")
			.order("desc")
			.take(args.limit ?? 100)
	},
})
