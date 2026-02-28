import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalMutation, mutation, query } from "./_generated/server"
import { authComponent, type BetterAuthUser, extractUserId, getAuthUserWithRole } from "./auth"
import { ALLOWED_DOC_MIMES, MAX_FILE_SIZE, validateAttachments } from "./uploadValidation"

export const listByConversation = query({
	args: {
		conversationId: v.id("conversations"),
		limit: v.optional(v.number()),
		cursor: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return { messages: [], hasMore: false }
		const userId = extractUserId(user)

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", userId).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return { messages: [], hasMore: false }

		const limit = args.limit ?? 50

		const query = ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) => {
				const base = q.eq("conversationId", args.conversationId)
				return args.cursor ? base.lt("createdAt", args.cursor) : base
			})
			.order("desc")

		const page = await query.take(limit + 1)
		const hasMore = page.length > limit
		const messages = page.slice(0, limit)

		// Batch fetch all unique sender profiles in parallel (instead of sequential for...of)
		const uniqueSenderIds = [...new Set(messages.map((m) => m.senderId))]
		const profileResults = await Promise.all(
			uniqueSenderIds.map((sid) =>
				ctx.db
					.query("userProfiles")
					.withIndex("by_userId", (q) => q.eq("userId", sid))
					.first(),
			),
		)

		// Batch fetch avatar URLs for profiles that have storage IDs
		const avatarEntries: { sid: string; storageId: string }[] = []
		for (let i = 0; i < uniqueSenderIds.length; i++) {
			const profile = profileResults[i]
			if (profile?.avatarStorageId) {
				avatarEntries.push({ sid: uniqueSenderIds[i], storageId: profile.avatarStorageId })
			}
		}
		const avatarUrls = await Promise.all(avatarEntries.map((e) => ctx.storage.getUrl(e.storageId)))
		const avatarMap = new Map<string, string | null>()
		for (let i = 0; i < avatarEntries.length; i++) {
			avatarMap.set(avatarEntries[i].sid, avatarUrls[i] ?? null)
		}

		// Build profiles map
		const profilesMap = new Map<
			string,
			{ nom: string | null; email: string | null; avatarUrl: string | null }
		>()
		for (let i = 0; i < uniqueSenderIds.length; i++) {
			const sid = uniqueSenderIds[i]
			const profile = profileResults[i]
			profilesMap.set(sid, {
				nom: profile?.nom ?? null,
				email: profile?.email ?? null,
				avatarUrl: avatarMap.get(sid) ?? null,
			})
		}

		const enriched = messages.map((msg) => ({
			...msg,
			senderName: profilesMap.get(msg.senderId)?.nom ?? null,
			senderEmail: profilesMap.get(msg.senderId)?.email ?? null,
			senderAvatarUrl: profilesMap.get(msg.senderId)?.avatarUrl ?? null,
		}))

		return { messages: enriched, hasMore }
	},
})

export const send = mutation({
	args: {
		conversationId: v.id("conversations"),
		content: v.string(),
		type: v.optional(v.union(v.literal("text"), v.literal("file"), v.literal("system"))),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.string(),
					fileSize: v.number(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()

		validateAttachments(args.attachments, ALLOWED_DOC_MIMES, MAX_FILE_SIZE)

		const conv = await ctx.db.get(args.conversationId)
		if (!conv) throw new Error("Conversation introuvable")

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", user.id).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) throw new Error("Vous n'êtes pas membre de cette conversation")

		const messageId = await ctx.db.insert("messages", {
			conversationId: args.conversationId,
			senderId: user.id,
			content: args.content,
			type: args.type ?? "text",
			attachments: args.attachments,
			createdAt: now,
		})

		const preview = args.content.length > 100 ? `${args.content.slice(0, 100)}...` : args.content
		await ctx.db.patch(args.conversationId, {
			lastMessageAt: now,
			lastMessagePreview: preview,
			updatedAt: now,
		})

		await ctx.db.patch(membership._id, { lastReadAt: now })

		await ctx.scheduler.runAfter(0, internal.messages.notifyMembers, {
			conversationId: args.conversationId,
			senderId: user.id,
			content: preview,
		})

		return messageId
	},
})

export const edit = mutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const msg = await ctx.db.get(args.messageId)
		if (!msg) throw new Error("Message introuvable")
		if (msg.senderId !== user.id) throw new Error("Vous ne pouvez modifier que vos messages")

		await ctx.db.patch(args.messageId, {
			content: args.content,
			isEdited: true,
			updatedAt: Date.now(),
		})
	},
})

export const deleteMessage = mutation({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const msg = await ctx.db.get(args.messageId)
		if (!msg) throw new Error("Message introuvable")
		if (msg.senderId !== user.id && user.role !== "admin") {
			throw new Error("Non autorisé")
		}

		await ctx.db.patch(args.messageId, {
			isDeleted: true,
			updatedAt: Date.now(),
		})
	},
})

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.storage.generateUploadUrl()
	},
})

export const getFileUrl = query({
	args: { storageId: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return null

		// NOTE: Idéalement, on vérifierait que le storageId correspond à un attachment
		// d'un message dans une conversation dont l'utilisateur est membre.
		// Cependant, chercher par storageId dans tous les messages est coûteux (pas d'index).
		// Les storageIds sont des UUID non devinables, donc le risque est faible.
		// Le check d'authentification ci-dessus suffit comme compromis pragmatique.

		return await ctx.storage.getUrl(args.storageId as Id<"_storage">)
	},
})

export const notifyMembers = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		senderId: v.string(),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const members = await ctx.db
			.query("conversationMembers")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.take(50)

		const senderProfile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", args.senderId))
			.first()
		const senderName = senderProfile?.nom ?? "Quelqu'un"

		// Filter out sender and muted members first
		const recipients = members.filter(
			(member) => member.userId !== args.senderId && !member.isMuted,
		)

		// Batch fetch presence for all recipients in parallel
		const presenceResults = await Promise.all(
			recipients.map((member) =>
				ctx.db
					.query("presence")
					.withIndex("by_userId", (q) => q.eq("userId", member.userId))
					.first(),
			),
		)

		// Insert notifications directly (batch) instead of scheduling one task per member
		const now = Date.now()
		for (let i = 0; i < recipients.length; i++) {
			const member = recipients[i]
			const presence = presenceResults[i]
			const isOnline = presence ? now - presence.lastSeen < 5 * 60 * 1000 : false

			if (!isOnline) {
				// Check for duplicate inline instead of scheduling
				if (args.conversationId) {
					const existing = await ctx.db
						.query("notifications")
						.withIndex("by_related_type", (q) =>
							q.eq("relatedId", args.conversationId).eq("type", "nouveau_message"),
						)
						.first()
					if (existing) continue
				}
				await ctx.db.insert("notifications", {
					userId: member.userId,
					type: "nouveau_message",
					titre: `Nouveau message de ${senderName}`,
					message: args.content,
					lien: `/messages?conversation=${args.conversationId}`,
					relatedId: args.conversationId,
					isRead: false,
					createdAt: now,
				})
			}
		}
	},
})
