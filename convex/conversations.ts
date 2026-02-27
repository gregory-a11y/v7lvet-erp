import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent, getAuthUserWithRole } from "./auth"

export const listMyConversations = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		const userId = (user._id as string) || (user.id as string)

		const memberships = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect()

		const conversations = await Promise.all(
			memberships.map(async (m) => {
				const conv = await ctx.db.get(m.conversationId)
				if (!conv) return null

				let unreadCount = 0
				if (m.lastReadAt) {
					const unreadMessages = await ctx.db
						.query("messages")
						.withIndex("by_conversation", (q) =>
							q.eq("conversationId", m.conversationId).gt("createdAt", m.lastReadAt!),
						)
						.collect()
					unreadCount = unreadMessages.filter((msg) => !msg.isDeleted).length
				} else {
					const allMessages = await ctx.db
						.query("messages")
						.withIndex("by_conversation", (q) => q.eq("conversationId", m.conversationId))
						.collect()
					unreadCount = allMessages.filter((msg) => !msg.isDeleted).length
				}

				// Enrichir les conversations "direct" avec les noms des membres
				let members: {
					userId: string
					nom: string | null
					email: string | null
					isOnline: boolean
					avatarUrl: string | null
				}[] = []
				if (conv.type === "direct") {
					const convMembers = await ctx.db
						.query("conversationMembers")
						.withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
						.collect()
					members = await Promise.all(
						convMembers.map(async (cm) => {
							const profile = await ctx.db
								.query("userProfiles")
								.withIndex("by_userId", (q) => q.eq("userId", cm.userId))
								.first()
							const presence = await ctx.db
								.query("presence")
								.withIndex("by_userId", (q) => q.eq("userId", cm.userId))
								.first()
							const isOnline = presence ? Date.now() - presence.lastSeen < 5 * 60 * 1000 : false
							let avatarUrl: string | null = null
							if (profile?.avatarStorageId) {
								avatarUrl = (await ctx.storage.getUrl(profile.avatarStorageId)) ?? null
							}
							return {
								userId: cm.userId,
								nom: profile?.nom ?? null,
								email: profile?.email ?? null,
								isOnline,
								avatarUrl,
							}
						}),
					)
				}

				return {
					...conv,
					unreadCount,
					isMuted: m.isMuted,
					lastReadAt: m.lastReadAt,
					members,
				}
			}),
		)

		return conversations
			.filter((c) => c !== null)
			.sort((a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt))
	},
})

export const getById = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null
		const userId = (user._id as string) || (user.id as string)

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", userId).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return null

		const conv = await ctx.db.get(args.conversationId)
		if (!conv) return null

		const members = await ctx.db
			.query("conversationMembers")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.collect()

		const enrichedMembers = await Promise.all(
			members.map(async (m) => {
				const profile = await ctx.db
					.query("userProfiles")
					.withIndex("by_userId", (q) => q.eq("userId", m.userId))
					.first()
				const presence = await ctx.db
					.query("presence")
					.withIndex("by_userId", (q) => q.eq("userId", m.userId))
					.first()
				const isOnline = presence ? Date.now() - presence.lastSeen < 5 * 60 * 1000 : false
				let avatarUrl: string | null = null
				if (profile?.avatarStorageId) {
					avatarUrl = (await ctx.storage.getUrl(profile.avatarStorageId)) ?? null
				}
				return {
					...m,
					nom: profile?.nom ?? null,
					email: profile?.email ?? null,
					role: profile?.role ?? null,
					isOnline,
					avatarUrl,
				}
			}),
		)

		return { ...conv, members: enrichedMembers, isMuted: membership.isMuted }
	},
})

export const getOrCreateDirect = mutation({
	args: { otherUserId: v.string() },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const myMemberships = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user", (q) => q.eq("userId", user.id))
			.collect()

		for (const m of myMemberships) {
			const conv = await ctx.db.get(m.conversationId)
			if (conv?.type !== "direct") continue
			const otherMember = await ctx.db
				.query("conversationMembers")
				.withIndex("by_user_conversation", (q) =>
					q.eq("userId", args.otherUserId).eq("conversationId", m.conversationId),
				)
				.first()
			if (otherMember) return m.conversationId
		}

		const now = Date.now()
		const conversationId = await ctx.db.insert("conversations", {
			type: "direct",
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})

		await ctx.db.insert("conversationMembers", {
			conversationId,
			userId: user.id,
			isMuted: false,
			joinedAt: now,
		})
		await ctx.db.insert("conversationMembers", {
			conversationId,
			userId: args.otherUserId,
			isMuted: false,
			joinedAt: now,
		})

		return conversationId
	},
})

export const createGroup = mutation({
	args: {
		name: v.string(),
		memberIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()

		const conversationId = await ctx.db.insert("conversations", {
			type: "group",
			name: args.name,
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})

		await ctx.db.insert("conversationMembers", {
			conversationId,
			userId: user.id,
			isMuted: false,
			joinedAt: now,
		})

		for (const memberId of args.memberIds) {
			if (memberId === user.id) continue
			await ctx.db.insert("conversationMembers", {
				conversationId,
				userId: memberId,
				isMuted: false,
				joinedAt: now,
			})
		}

		return conversationId
	},
})

export const createClientChannel = mutation({
	args: {
		clientId: v.id("clients"),
		memberIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Seuls les admins et managers peuvent créer un canal client")
		}

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client introuvable")

		const now = Date.now()
		const conversationId = await ctx.db.insert("conversations", {
			type: "client",
			name: client.raisonSociale,
			clientId: args.clientId,
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})

		await ctx.db.insert("conversationMembers", {
			conversationId,
			userId: user.id,
			isMuted: false,
			joinedAt: now,
		})

		for (const memberId of args.memberIds) {
			if (memberId === user.id) continue
			await ctx.db.insert("conversationMembers", {
				conversationId,
				userId: memberId,
				isMuted: false,
				joinedAt: now,
			})
		}

		return conversationId
	},
})

export const addMember = mutation({
	args: {
		conversationId: v.id("conversations"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Vérifier que l'appelant est membre de la conversation
		const callerMembership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!callerMembership) throw new Error("Non autorisé")

		const conv = await ctx.db.get(args.conversationId)
		if (!conv) throw new Error("Conversation introuvable")
		if (conv.type === "direct") throw new Error("Impossible d'ajouter un membre à un DM")

		// Seul le créateur ou un admin peut gérer les membres
		if (conv.createdById !== user.id && user.role !== "admin") {
			throw new Error("Seul le créateur ou un admin peut gérer les membres")
		}

		const existing = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", args.userId).eq("conversationId", args.conversationId),
			)
			.first()
		if (existing) return existing._id

		return ctx.db.insert("conversationMembers", {
			conversationId: args.conversationId,
			userId: args.userId,
			isMuted: false,
			joinedAt: Date.now(),
		})
	},
})

export const removeMember = mutation({
	args: {
		conversationId: v.id("conversations"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Vérifier que l'appelant est membre de la conversation
		const callerMembership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!callerMembership) throw new Error("Non autorisé")

		const conv = await ctx.db.get(args.conversationId)
		if (!conv) throw new Error("Conversation introuvable")
		if (conv.type === "direct") throw new Error("Impossible de retirer un membre d'un DM")

		// Seul le créateur ou un admin peut gérer les membres
		if (conv.createdById !== user.id && user.role !== "admin") {
			throw new Error("Seul le créateur ou un admin peut gérer les membres")
		}

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", args.userId).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return

		await ctx.db.delete(membership._id)
	},
})

export const updateName = mutation({
	args: {
		conversationId: v.id("conversations"),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Vérifier que l'appelant est membre de la conversation
		const callerMembership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!callerMembership) throw new Error("Non autorisé")

		const conv = await ctx.db.get(args.conversationId)
		if (!conv) throw new Error("Conversation introuvable")
		if (conv.type === "direct") throw new Error("Impossible de renommer un DM")

		await ctx.db.patch(args.conversationId, {
			name: args.name,
			updatedAt: Date.now(),
		})
	},
})

export const markAsRead = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return

		await ctx.db.patch(membership._id, { lastReadAt: Date.now() })
	},
})

export const toggleMute = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return

		await ctx.db.patch(membership._id, { isMuted: !membership.isMuted })
	},
})
