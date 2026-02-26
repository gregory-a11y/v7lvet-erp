import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"
import authConfig from "./auth.config"
import { sendPasswordResetEmail } from "./email"
import schema from "./schema"

const siteUrl = process.env.SITE_URL!
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
				void sendPasswordResetEmail({
					email: user.email,
					name: user.name,
					resetUrl: url,
				})
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
	const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
	if (!user) throw new Error("Non authentifié")

	const userId = (user._id as string) || (user.id as string)
	const profile = await ctx.db
		.query("userProfiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.first()

	return {
		...user,
		_id: user._id as string,
		_creationTime: user._creationTime as number,
		name: user.name as string,
		email: user.email as string,
		emailVerified: user.emailVerified as boolean,
		image: user.image as string | null | undefined,
		role: profile?.role ?? "collaborateur",
		mustChangePassword: profile?.mustChangePassword ?? false,
		sections: profile?.sections ?? null,
		id: userId,
	}
}

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null

		const userId = (user._id as string) || (user.id as string)
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()

		return {
			name: user.name as string,
			email: user.email as string,
			emailVerified: user.emailVerified as boolean,
			image: user.image as string | null | undefined,
			role: profile?.role ?? ("collaborateur" as const),
			mustChangePassword: profile?.mustChangePassword ?? false,
			sections: profile?.sections ?? null,
			id: userId,
		}
	},
})
