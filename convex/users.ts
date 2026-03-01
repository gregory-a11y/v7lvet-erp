import { hashPassword, verifyPassword } from "better-auth/crypto"
import { v } from "convex/values"
import { components, internal } from "./_generated/api"
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { authComponent, type BetterAuthUser, extractUserId, getAuthUserWithRole } from "./auth"
import { sendWelcomeEmail } from "./email"
import { ALLOWED_IMAGE_MIMES, MAX_AVATAR_SIZE, validateFile } from "./uploadValidation"

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
		role: v.union(v.literal("admin"), v.literal("manager"), v.literal("collaborateur")),
		nom: v.optional(v.string()),
		email: v.optional(v.string()),
		mustChangePassword: v.optional(v.boolean()),
		sections: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const now = Date.now()
		return ctx.db.insert("userProfiles", {
			userId: args.userId,
			role: args.role,
			nom: args.nom,
			email: args.email,
			mustChangePassword: args.mustChangePassword,
			sections: args.sections,
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
		newRole: v.union(v.literal("admin"), v.literal("manager"), v.literal("collaborateur")),
	},
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		if (currentUser.role !== "admin") throw new Error("Seul un admin peut modifier les rôles")

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		// Prevent downgrading the last admin
		if (profile.role === "admin" && args.newRole !== "admin") {
			const allProfiles = await ctx.db.query("userProfiles").collect()
			const adminCount = allProfiles.filter((p) => p.role === "admin").length
			if (adminCount <= 1) {
				throw new Error("Impossible de retirer le rôle admin au dernier administrateur")
			}
		}

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
		if (currentUser.role !== "admin" && !isSelf) throw new Error("Non autorisé")

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

export const generateAvatarUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return await ctx.storage.generateUploadUrl()
	},
})

export const updateAvatar = mutation({
	args: {
		storageId: v.string(),
		mimeType: v.optional(v.string()),
		fileSize: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		const userId = currentUser.id as string

		validateFile(args.mimeType, args.fileSize, ALLOWED_IMAGE_MIMES, MAX_AVATAR_SIZE)

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		// Delete old avatar from storage if exists
		if (profile.avatarStorageId) {
			await ctx.storage.delete(profile.avatarStorageId as any)
		}

		await ctx.db.patch(profile._id, {
			avatarStorageId: args.storageId,
			updatedAt: Date.now(),
		})
	},
})

export const removeAvatar = mutation({
	args: {},
	handler: async (ctx) => {
		const currentUser = await getAuthUserWithRole(ctx)
		const userId = currentUser.id as string

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		if (profile.avatarStorageId) {
			await ctx.storage.delete(profile.avatarStorageId as any)
		}

		await ctx.db.patch(profile._id, {
			avatarStorageId: undefined,
			updatedAt: Date.now(),
		})
	},
})

export const getAvatarUrl = query({
	args: { storageId: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null
		if (!args.storageId) return null
		return await ctx.storage.getUrl(args.storageId as any)
	},
})

export const getMyProfile = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null

		const userId = (user._id as string) || (user.id as string)

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()

		let avatarUrl: string | null = null
		if (profile?.avatarStorageId) {
			avatarUrl = await ctx.storage.getUrl(profile.avatarStorageId as any)
		}

		return {
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
			avatarStorageId: profile?.avatarStorageId ?? null,
			avatarUrl,
			profileId: profile?._id ?? null,
		}
	},
})

function generatePassword() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%"
	const randomBytes = new Uint8Array(16)
	crypto.getRandomValues(randomBytes)
	return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("")
}

/**
 * Directly updates a user's password in the Better Auth component database.
 * Used by admin actions to set/reset passwords without needing a session.
 */
async function setUserPasswordDirect(
	ctx: {
		runQuery: (ref: any, args: any) => Promise<any>
		runMutation: (ref: any, args: any) => Promise<any>
	},
	userId: string,
	newPassword: string,
) {
	const hashedPassword = await hashPassword(newPassword)

	const account = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "account",
		where: [
			{ field: "userId", value: userId },
			{ field: "providerId", value: "credential" },
		],
	})) as { _id: string } | null

	if (!account) {
		console.warn(`[setUserPasswordDirect] No credential account found for userId=${userId}`)
		return false
	}

	await ctx.runMutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "account",
			update: { password: hashedPassword },
			where: [{ field: "_id", value: account._id }],
		},
	})

	console.log(`[setUserPasswordDirect] Password updated for userId=${userId}`)
	return true
}

const SECTION_DEFAULTS: Record<string, string[]> = {
	admin: ["operationnel", "acquisition", "administration"],
	manager: ["operationnel", "acquisition"],
	collaborateur: ["operationnel"],
}

export const getUserSections = query({
	args: { userId: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		const targetUserId = args.userId ?? (currentUser.id as string)

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", targetUserId))
			.first()

		if (profile?.sections && profile.sections.length > 0) {
			return profile.sections
		}

		const role = profile?.role ?? "collaborateur"
		return SECTION_DEFAULTS[role] ?? SECTION_DEFAULTS.collaborateur
	},
})

export const updateUserSections = mutation({
	args: {
		userId: v.string(),
		sections: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		if (currentUser.role !== "admin") throw new Error("Seul un admin peut modifier les sections")

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		await ctx.db.patch(profile._id, {
			sections: args.sections,
			updatedAt: Date.now(),
		})
	},
})

export const clearMustChangePasswordInternal = internalMutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		await ctx.db.patch(profile._id, {
			mustChangePassword: false,
			updatedAt: Date.now(),
		})
	},
})

export const verifyAndClearMustChangePassword = action({
	args: { newPassword: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) throw new Error("Non authentifié")
		const userId = extractUserId(user)

		// Verify the password matches the current stored hash (proves it was actually changed)
		const account = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: "account",
			where: [
				{ field: "userId", value: userId },
				{ field: "providerId", value: "credential" },
			],
		})) as { password?: string } | null

		if (!account?.password) throw new Error("Compte non trouvé")

		const isValid = await verifyPassword({
			password: args.newPassword,
			hash: account.password,
		})
		if (!isValid) throw new Error("Vérification du mot de passe échouée")

		await ctx.runMutation(internal.users.clearMustChangePasswordInternal, { userId })
	},
})

export const setMustChangePassword = internalMutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) return
		await ctx.db.patch(profile._id, {
			mustChangePassword: true,
			updatedAt: Date.now(),
		})
	},
})

export const deleteMember = mutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const currentUser = await getAuthUserWithRole(ctx)
		if (currentUser.role !== "admin") throw new Error("Seul un admin peut supprimer des membres")

		// Prevent self-deletion
		if ((currentUser.id as string) === args.userId) {
			throw new Error("Vous ne pouvez pas supprimer votre propre compte")
		}

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first()
		if (!profile) throw new Error("Profil non trouvé")

		// Prevent deleting the last admin
		if (profile.role === "admin") {
			const allProfiles = await ctx.db.query("userProfiles").collect()
			const adminCount = allProfiles.filter((p) => p.role === "admin").length
			if (adminCount <= 1) {
				throw new Error("Impossible de supprimer le dernier administrateur")
			}
		}

		// Delete avatar from storage if exists
		if (profile.avatarStorageId) {
			await ctx.storage.delete(profile.avatarStorageId as any)
		}

		// Delete Better Auth sessions for this user
		const sessions = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: "session",
			where: [{ field: "userId", value: args.userId }],
			paginationOpts: { numItems: 100, cursor: null },
		})) as { page: Array<{ _id: string }> }
		for (const session of sessions.page) {
			await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
				input: { model: "session", where: [{ field: "_id", value: session._id }] },
			})
		}

		// Delete Better Auth accounts (credential, etc.)
		const accounts = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: "account",
			where: [{ field: "userId", value: args.userId }],
			paginationOpts: { numItems: 100, cursor: null },
		})) as { page: Array<{ _id: string }> }
		for (const account of accounts.page) {
			await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
				input: { model: "account", where: [{ field: "_id", value: account._id }] },
			})
		}

		// Delete Better Auth user record
		await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
			input: { model: "user", where: [{ field: "_id", value: args.userId }] },
		})

		// Delete the profile
		await ctx.db.delete(profile._id)
	},
})

export const createByAdmin = action({
	args: {
		email: v.string(),
		name: v.string(),
		role: v.union(v.literal("admin"), v.literal("manager"), v.literal("collaborateur")),
		sections: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const currentUser = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
		if (!currentUser) throw new Error("Non authentifié")

		const userId = (currentUser._id as string) || (currentUser.id as string)
		const currentRole = await ctx.runQuery(internal.users.getUserRole, { userId })
		if (currentRole !== "admin") {
			throw new Error("Seul un admin peut créer des utilisateurs")
		}

		// Rate limit: max 1 creation per 10 seconds per admin
		await ctx.runMutation(internal.rateLimit.enforce, {
			action: "createByAdmin",
			key: userId,
			cooldownMs: 10_000,
		})

		const password = generatePassword()
		const siteUrl = process.env.SITE_URL
		if (!siteUrl)
			throw new Error("SITE_URL non configuré dans les variables d'environnement Convex")

		// Try to create the account
		console.log(`[createByAdmin] Creating account for ${args.email}...`)
		const response = await fetch(`${siteUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: args.email,
				password,
				name: args.name,
			}),
		})

		let isExistingUser = false
		let targetUserId: string | null = null

		if (!response.ok) {
			const text = await response.text()
			if (text.includes("USER_ALREADY_EXISTS")) {
				console.log(`[createByAdmin] User ${args.email} already exists — updating password`)
				isExistingUser = true
			} else {
				console.error(`[createByAdmin] Sign-up failed: ${response.status} ${text}`)
				throw new Error(`Erreur lors de la création du compte: ${text}`)
			}
		} else {
			const data = await response.json()
			console.log(`[createByAdmin] Sign-up response:`, JSON.stringify(data))
			targetUserId = data?.user?.id ?? data?.user?._id ?? null
			console.log(`[createByAdmin] Account created, userId: ${targetUserId}`)
		}

		if (isExistingUser || !targetUserId) {
			// Find the existing Better Auth user by email to get their userId
			const existingUser = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: "user",
				where: [{ field: "email", value: args.email }],
			})) as { _id: string } | null

			if (existingUser) {
				targetUserId = existingUser._id
				// Update their password in Better Auth
				await setUserPasswordDirect(ctx, existingUser._id, password)
				// Also flag must change password
				await ctx.runMutation(internal.users.setMustChangePassword, { userId: existingUser._id })
				console.log(
					`[createByAdmin] Password updated for existing user ${args.email}, userId: ${existingUser._id}`,
				)
			} else {
				console.warn(`[createByAdmin] User not found by email ${args.email}`)
			}
		}

		// Create userProfile if it doesn't exist yet
		if (targetUserId) {
			const existingProfile = await ctx.runQuery(internal.users.getUserRole, {
				userId: targetUserId,
			})
			if (!existingProfile) {
				await ctx.runMutation(internal.users.createUserProfile, {
					userId: targetUserId,
					role: args.role,
					nom: args.name,
					email: args.email,
					mustChangePassword: true,
					sections: args.sections,
				})
				console.log("[createByAdmin] Profile created")
			} else {
				console.log("[createByAdmin] Profile already exists, skipping creation")
			}
		} else {
			console.error("[createByAdmin] Could not determine userId — profile NOT created")
		}

		// Send welcome email
		const emailSent = await sendWelcomeEmail({
			email: args.email,
			name: args.name,
			password,
			siteUrl,
			subject: isExistingUser
				? "V7LVET ERP — Vos nouveaux identifiants"
				: "Bienvenue sur V7LVET ERP — Vos identifiants",
		})

		return {
			success: true,
			generatedPassword: password,
			emailSent,
			isExistingUser,
		}
	},
})

export const resendWelcomeEmail = action({
	args: {
		userId: v.string(),
		email: v.string(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const currentUser = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
		if (!currentUser) throw new Error("Non authentifié")

		const callerUserId = (currentUser._id as string) || (currentUser.id as string)
		const currentRole = await ctx.runQuery(internal.users.getUserRole, { userId: callerUserId })
		if (currentRole !== "admin") {
			throw new Error("Seul un admin peut renvoyer des identifiants")
		}

		// Rate limit: max 1 resend per 30 seconds per target user
		await ctx.runMutation(internal.rateLimit.enforce, {
			action: "resendWelcomeEmail",
			key: args.userId,
			cooldownMs: 30_000,
		})

		const password = generatePassword()
		const siteUrl = process.env.SITE_URL
		if (!siteUrl)
			throw new Error("SITE_URL non configuré dans les variables d'environnement Convex")

		// Actually update the password in Better Auth
		const passwordUpdated = await setUserPasswordDirect(ctx, args.userId, password)
		if (!passwordUpdated) {
			throw new Error("Impossible de mettre à jour le mot de passe — compte non trouvé")
		}

		await ctx.runMutation(internal.users.setMustChangePassword, { userId: args.userId })

		const emailSent = await sendWelcomeEmail({
			email: args.email,
			name: args.name,
			password,
			siteUrl,
			subject: "V7LVET ERP — Vos nouveaux identifiants",
		})

		return { success: true, generatedPassword: password, emailSent }
	},
})

// ─── Login rate limiting ────────────────────────────────────────────────────
export const checkLoginRateLimit = mutation({
	args: { email: v.string() },
	handler: async (ctx, args) => {
		const now = Date.now()
		const cooldownMs = 3_000 // 3 seconds between attempts per email
		const existing = await ctx.db
			.query("rateLimits")
			.withIndex("by_action_key", (q) => q.eq("action", "login").eq("key", args.email))
			.first()

		if (existing && now - existing.lastAttempt < cooldownMs) {
			const waitSec = Math.ceil((cooldownMs - (now - existing.lastAttempt)) / 1000)
			throw new Error(
				`Trop de tentatives. Réessayez dans ${waitSec} seconde${waitSec > 1 ? "s" : ""}.`,
			)
		}

		if (existing) {
			await ctx.db.patch(existing._id, { lastAttempt: now })
		} else {
			await ctx.db.insert("rateLimits", { action: "login", key: args.email, lastAttempt: now })
		}
	},
})

// ─── Clear mustChangePassword after email reset ─────────────────────────────
export const clearMustChangePasswordByEmail = action({
	args: { email: v.string(), newPassword: v.string() },
	handler: async (ctx, args) => {
		// Find the user by email in Better Auth
		const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: "user",
			where: [{ field: "email", value: args.email }],
		})) as { _id: string } | null
		if (!user) return

		// Verify the password to ensure the reset actually happened
		const account = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: "account",
			where: [
				{ field: "userId", value: user._id },
				{ field: "providerId", value: "credential" },
			],
		})) as { password?: string } | null
		if (!account?.password) return

		const isValid = await verifyPassword({
			password: args.newPassword,
			hash: account.password,
		})
		if (!isValid) return

		await ctx.runMutation(internal.users.clearMustChangePasswordInternal, { userId: user._id })
	},
})
