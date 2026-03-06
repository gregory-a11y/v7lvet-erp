import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { components } from "./_generated/api"
import type { DataModel, Id } from "./_generated/dataModel"
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
	verbose: false,
})

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth({
		baseURL: siteUrl,
		trustedOrigins,
		database: authComponent.adapter(ctx),
		rateLimit: {
			enabled: false,
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			resetPasswordTokenExpiresIn: 3600,
			sendResetPassword: async ({ user, url }) => {
				try {
					await sendPasswordResetEmail({
						email: user.email,
						name: user.name,
						resetUrl: url,
					})
				} catch (err) {
					console.error(
						"[auth] sendResetPassword error:",
						err instanceof Error ? err.message : "unknown",
					)
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
 * Throws if not authenticated. Use in mutations only.
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

/**
 * Safe version — returns null if not authenticated instead of throwing.
 * Use in queries (subscriptions) to avoid log noise during auth loading.
 */
export const safeGetAuthUserWithRole = async (
	ctx: QueryCtx | MutationCtx,
): Promise<UserWithRole | null> => {
	const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
	if (!user) return null

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

/**
 * Checks if the user has access to a given client based on role cascade.
 * Returns true if access is granted, false otherwise.
 */
export const canAccessClient = async (
	ctx: QueryCtx | MutationCtx,
	user: UserWithRole,
	clientId: Id<"clients">,
): Promise<boolean> => {
	if (user.role === "admin") return true
	if (user.role === "manager") {
		const client = await ctx.db.get(clientId)
		if (!client) return false
		return (
			client.responsableOperationnelId === (user.id as string) ||
			client.responsableHierarchiqueId === (user.id as string)
		)
	}
	// collaborateur
	const dossier = await ctx.db
		.query("dossiers")
		.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
		.filter((q) => q.eq(q.field("clientId"), clientId))
		.first()
	return !!dossier
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

		let fonctionNom: string | null = null
		if (profile?.fonctionId) {
			const f = await ctx.db.get(profile.fonctionId)
			fonctionNom = f?.nom ?? null
		}

		return {
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			image: user.image,
			role: profile?.role ?? ("collaborateur" as const),
			mustChangePassword: profile?.mustChangePassword ?? false,
			sections: profile?.sections ?? null,
			id: userId,
			fonctionNom,
		}
	},
})
