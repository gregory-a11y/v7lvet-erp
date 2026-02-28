import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"
import authConfig from "./auth.config"
import { sendPasswordResetEmail } from "./email"
import schema from "./schema"

/** Better Auth user document shape returned by authComponent.getAuthUser/safeGetAuthUser */
export interface BetterAuthUser {
	_id: string
	_creationTime: number
	name: string
	email: string
	emailVerified: boolean
	image?: string | null
	createdAt: number
	updatedAt: number
	// Better Auth may add optional fields (userId, twoFactorEnabled, etc.)
	[key: string]: unknown
}

/** Safely extracts the user ID from a Better Auth user document */
export function extractUserId(user: BetterAuthUser): string {
	const userId = user._id || (user as { id?: string }).id
	if (!userId) throw new Error("Impossible d'extraire l'ID utilisateur")
	return String(userId)
}

const siteUrl = process.env.SITE_URL
if (!siteUrl) throw new Error("SITE_URL non configuré dans les variables d'environnement Convex")
// TRUSTED_ORIGINS: liste séparée par virgule d'origines supplémentaires
const extraOrigins = process.env.TRUSTED_ORIGINS
	? process.env.TRUSTED_ORIGINS.split(",")
			.map((o) => o.trim())
			.filter(Boolean)
	: []
const trustedOrigins = [siteUrl, ...extraOrigins].filter(Boolean)

export const authComponent = createClient<DataModel, typeof schema>(components.betterAuth, {
	local: { schema },
	verbose: true,
})

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth({
		baseURL: siteUrl,
		trustedOrigins,
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			resetPasswordTokenExpiresIn: 3600,
			sendResetPassword: async ({ user, url }) => {
				// Append email to reset URL so the page can clear mustChangePassword
				const resetUrl = `${url}${url.includes("?") ? "&" : "?"}email=${encodeURIComponent(user.email)}`
				try {
					await sendPasswordResetEmail({
						email: user.email,
						name: user.name,
						resetUrl,
					})
				} catch (err) {
					console.error("[auth] sendResetPassword error:", err)
				}
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		},
		plugins: [convex({ authConfig })],
	})
}

export type UserWithRole = {
	_id: string
	_creationTime: number
	name: string
	email: string
	emailVerified: boolean
	image?: string | null
	role: string
	mustChangePassword: boolean
	sections: string[] | null
	id: string
}

/**
 * Gets the authenticated user enriched with role from userProfiles table.
 * Throws if not authenticated.
 */
export const getAuthUserWithRole = async (ctx: QueryCtx | MutationCtx): Promise<UserWithRole> => {
	const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser
	if (!user) throw new Error("Non authentifié")

	const userId = extractUserId(user)
	const profile = await ctx.db
		.query("userProfiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.first()

	return {
		_id: user._id,
		_creationTime: user._creationTime,
		name: user.name,
		email: user.email,
		emailVerified: user.emailVerified,
		image: user.image,
		role: profile?.role ?? "collaborateur",
		mustChangePassword: profile?.mustChangePassword ?? false,
		sections: profile?.sections ?? null,
		id: userId,
	}
}

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return null

		const userId = extractUserId(user)
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()

		return {
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			image: user.image,
			role: profile?.role ?? ("collaborateur" as const),
			mustChangePassword: profile?.mustChangePassword ?? false,
			sections: profile?.sections ?? null,
			id: userId,
		}
	},
})
