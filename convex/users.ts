import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { authComponent, getAuthUserWithRole } from "./auth"

export const me = query({
	args: {},
	handler: async (ctx) => {
		return getAuthUserWithRole(ctx)
	},
})

export const getUserRole = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		return profile?.role ?? null
	},
})

export const createUserProfile = internalMutation({
	args: {
		userId: v.string(),
		role: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
		nom: v.optional(v.string()),
		email: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now()
		return ctx.db.insert("userProfiles", {
			userId: args.userId,
			role: args.role,
			nom: args.nom,
			email: args.email,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const listAll = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.query("userProfiles").collect()
	},
})

export const updateRole = mutation({
	args: {
		userId: v.string(),
		newRole: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
	},
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		if (currentUser.role !== "associe") throw new Error("Seul un associé peut modifier les rôles")

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		await ctx.db.patch(profile._id, { role: args.newRole, updatedAt: Date.now() })
	},
})

export const updateProfile = mutation({
	args: {
		userId: v.string(),
		nom: v.optional(v.string()),
		email: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		const isSelf = (currentUser.id as string) === args.userId
		if (currentUser.role !== "associe" && !isSelf) throw new Error("Non autorisé")

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		const updates: { nom?: string; email?: string; updatedAt: number } = { updatedAt: Date.now() }
		if (args.nom !== undefined) updates.nom = args.nom
		if (args.email !== undefined) updates.email = args.email
		await ctx.db.patch(profile._id, updates)
	},
})

export const createByAdmin = action({
	args: {
		email: v.string(),
		password: v.string(),
		name: v.string(),
		role: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
	},
	handler: async (ctx, args) => {
		// Actions don't have ctx.db — use authComponent + internalQuery for role
		const currentUser = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
		if (!currentUser) throw new Error("Non authentifié")

		const userId = (currentUser._id as string) || (currentUser.id as string)
		const currentRole = await ctx.runQuery(internal.users.getUserRole, { userId })
		if (currentRole !== "associe") {
			throw new Error("Seul un associé peut créer des utilisateurs")
		}

		const siteUrl = process.env.SITE_URL!
		const response = await fetch(`${siteUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: args.email,
				password: args.password,
				name: args.name,
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Erreur lors de la création du compte: ${text}`)
		}

		// Extract new user ID from response to create their profile
		const data = await response.json()
		const newUserId = data?.user?.id
		if (newUserId) {
			await ctx.runMutation(internal.users.createUserProfile, {
				userId: newUserId,
				role: args.role,
				nom: args.name,
				email: args.email,
			})
		}

		return { success: true }
	},
})
