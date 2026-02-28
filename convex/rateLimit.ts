import { v } from "convex/values"
import type { MutationCtx } from "./_generated/server"
import { internalMutation } from "./_generated/server"

/**
 * Simple rate limiting based on the rateLimits table.
 * Checks if the same action+key was performed within the cooldown window.
 * If so, throws an error. Otherwise, records the action.
 *
 * Use directly in mutations, or call the internalMutation `enforce`
 * via ctx.runMutation from actions.
 */
export async function checkRateLimit(
	ctx: MutationCtx,
	action: string,
	key: string,
	cooldownMs: number,
): Promise<void> {
	const now = Date.now()
	const existing = await ctx.db
		.query("rateLimits")
		.withIndex("by_action_key", (q) => q.eq("action", action).eq("key", key))
		.first()

	if (existing && now - existing.lastAttempt < cooldownMs) {
		const waitSec = Math.ceil((cooldownMs - (now - existing.lastAttempt)) / 1000)
		throw new Error(
			`Action trop fréquente. Réessayez dans ${waitSec} seconde${waitSec > 1 ? "s" : ""}.`,
		)
	}

	if (existing) {
		await ctx.db.patch(existing._id, { lastAttempt: now })
	} else {
		await ctx.db.insert("rateLimits", { action, key, lastAttempt: now })
	}
}

/**
 * Internal mutation callable from actions via ctx.runMutation.
 * Enforces rate limiting from action context.
 */
export const enforce = internalMutation({
	args: {
		action: v.string(),
		key: v.string(),
		cooldownMs: v.number(),
	},
	handler: async (ctx, args) => {
		await checkRateLimit(ctx, args.action, args.key, args.cooldownMs)
	},
})
