import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { authComponent, type BetterAuthUser, extractUserId, getAuthUserWithRole } from "./auth"

export const listMyConversations = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return []
		const userId = extractUserId(user)

		const memberships = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.take(100)

		// Batch fetch all conversations in parallel
		const conversations = await Promise.all(
			memberships.map(async (m) => {
				const conv = await ctx.db.get(m.conversationId)
				if (!conv) return null

				// Compute unread count with a capped fetch instead of .collect()
				let unreadCount = 0
				if (m.lastReadAt) {
					const unreadMessages = await ctx.db
						.query("messages")
						.withIndex("by_conversation", (q) =>
							q.eq("conversationId", m.conversationId).gt("createdAt", m.lastReadAt!),
						)
						.take(100)
					unreadCount = unreadMessages.filter((msg) => !msg.isDeleted).length
				} else {
					const allMessages = await ctx.db
						.query("messages")
						.withIndex("by_conversation", (q) => q.eq("conversationId", m.conversationId))
						.take(100)
					unreadCount = allMessages.filter((msg) => !msg.isDeleted).length
				}

				return {
					conv,
					unreadCount,
					membership: m,
				}
			}),
		)

		const validConversations = conversations.filter((c): c is NonNullable<typeof c> => c !== null)

		// Collect all unique userIds needed for direct conversations
		const directConvMemberIds = new Set<string>()
		const directConvs = validConversations.filter((c) => c.conv.type === "direct")

		// Batch fetch all conversation members for direct convs in parallel
		const directMembersResults = await Promise.all(
			directConvs.map((c) =>
				ctx.db
					.query("conversationMembers")
					.withIndex("by_conversation", (q) => q.eq("conversationId", c.conv._id))
					.take(10),
			),
		)

		// Build a map of conversationId -> members
		const convMembersMap = new Map<string, (typeof directMembersResults)[0]>()
		for (let i = 0; i < directConvs.length; i++) {
			const convId = directConvs[i].conv._id
			const members = directMembersResults[i]
			convMembersMap.set(convId, members)
			for (const cm of members) {
				directConvMemberIds.add(cm.userId)
			}
		}

		// Batch fetch all unique profiles and presences in parallel
		const uniqueUserIds = [...directConvMemberIds]
		const [profileResults, presenceResults] = await Promise.all([
			Promise.all(
				uniqueUserIds.map((uid) =>
					ctx.db
						.query("userProfiles")
						.withIndex("by_userId", (q) => q.eq("userId", uid))
						.first(),
				),
			),
			Promise.all(
				uniqueUserIds.map((uid) =>
					ctx.db
						.query("presence")
						.withIndex("by_userId", (q) => q.eq("userId", uid))
						.first(),
				),
			),
		])

		// Build lookup maps
		const profileMap = new Map<string, (typeof profileResults)[0]>()
		const presenceMap = new Map<string, (typeof presenceResults)[0]>()
		for (let i = 0; i < uniqueUserIds.length; i++) {
			profileMap.set(uniqueUserIds[i], profileResults[i])
			presenceMap.set(uniqueUserIds[i], presenceResults[i])
		}

		// Batch fetch avatar URLs for profiles that have them
		const avatarEntries: { userId: string; storageId: string }[] = []
		for (const [uid, profile] of profileMap) {
			if (profile?.avatarStorageId) {
				avatarEntries.push({ userId: uid, storageId: profile.avatarStorageId })
			}
		}
		const avatarUrls = await Promise.all(avatarEntries.map((e) => ctx.storage.getUrl(e.storageId)))
		const avatarMap = new Map<string, string | null>()
		for (let i = 0; i < avatarEntries.length; i++) {
			avatarMap.set(avatarEntries[i].userId, avatarUrls[i] ?? null)
		}

		// Assemble final results
		const result = validConversations.map((c) => {
			let members: {
				userId: string
				nom: string | null
				email: string | null
				isOnline: boolean
				avatarUrl: string | null
			}[] = []

			if (c.conv.type === "direct") {
				const convMembers = convMembersMap.get(c.conv._id) ?? []
				members = convMembers.map((cm) => {
					const profile = profileMap.get(cm.userId)
					const presence = presenceMap.get(cm.userId)
					const isOnline = presence ? Date.now() - presence.lastSeen < 5 * 60 * 1000 : false
					return {
						userId: cm.userId,
						nom: profile?.nom ?? null,
						email: profile?.email ?? null,
						isOnline,
						avatarUrl: avatarMap.get(cm.userId) ?? null,
					}
				})
			}

			return {
				...c.conv,
				unreadCount: c.unreadCount,
				isMuted: c.membership.isMuted,
				lastReadAt: c.membership.lastReadAt,
				members,
			}
		})

		return result.sort(
			(a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt),
		)
	},
})

export const getById = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return null
		const userId = extractUserId(user)

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
