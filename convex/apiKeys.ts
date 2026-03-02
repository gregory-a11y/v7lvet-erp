import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

async function hashKey(key: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(key)
	const hashBuffer = await crypto.subtle.digest("SHA-256", data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function generateApiKey(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	let result = "v7l_"
	for (let i = 0; i < 40; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return result
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		const keys = await ctx.db.query("apiKeys").collect()
		// Never return the hash, only prefix
		return keys.map((k) => ({
			_id: k._id,
			_creationTime: k._creationTime,
			name: k.name,
			keyPrefix: k.keyPrefix,
			isActive: k.isActive,
			lastUsedAt: k.lastUsedAt,
			createdAt: k.createdAt,
		}))
	},
})

export const create = mutation({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")

		const rawKey = generateApiKey()
		const keyHash = await hashKey(rawKey)
		const keyPrefix = rawKey.substring(0, 8)

		await ctx.db.insert("apiKeys", {
			name: args.name,
			keyHash,
			keyPrefix,
			createdById: user.id,
			isActive: true,
			createdAt: Date.now(),
		})

		// Return the raw key ONCE — it won't be retrievable again
		return { key: rawKey, prefix: keyPrefix }
	},
})

export const revoke = mutation({
	args: { id: v.id("apiKeys") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		await ctx.db.patch(args.id, { isActive: false })
	},
})

export const remove = mutation({
	args: { id: v.id("apiKeys") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		await ctx.db.delete(args.id)
	},
})

// ─── Validate API key (internal use by HTTP endpoint) ───────────────────────

export const validateKey = async (ctx: any, rawKey: string): Promise<boolean> => {
	const keyHash = await hashKey(rawKey)
	const found = await ctx.db
		.query("apiKeys")
		.withIndex("by_keyHash", (q: any) => q.eq("keyHash", keyHash))
		.first()

	if (!found || !found.isActive) return false

	// Update lastUsedAt
	await ctx.db.patch(found._id, { lastUsedAt: Date.now() })
	return true
}
