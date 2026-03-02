import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction, mutation, query } from "./_generated/server"
import { authComponent, type BetterAuthUser, extractUserId, getAuthUserWithRole } from "./auth"
import { sendDocumentRequestEmail, sendDocumentUploadedEmail } from "./email"

export const create = mutation({
	args: {
		conversationId: v.id("conversations"),
		clientId: v.id("clients"),
		title: v.string(),
		description: v.optional(v.string()),
		dueDate: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()

		const conv = await ctx.db.get(args.conversationId)
		if (!conv || conv.type !== "client") {
			throw new Error("Cette action n'est disponible que dans les canaux clients")
		}

		const requestId = await ctx.db.insert("documentRequests", {
			conversationId: args.conversationId,
			clientId: args.clientId,
			requestedById: user.id,
			title: args.title,
			description: args.description,
			status: "pending",
			dueDate: args.dueDate,
			createdAt: now,
			updatedAt: now,
		})

		// Create a document_request message in the conversation
		const content = args.description
			? `Demande de document : ${args.title} — ${args.description}`
			: `Demande de document : ${args.title}`

		await ctx.db.insert("messages", {
			conversationId: args.conversationId,
			senderId: user.id,
			content,
			type: "document_request",
			documentRequestId: requestId,
			createdAt: now,
		})

		const preview = content.length > 100 ? `${content.slice(0, 100)}...` : content
		await ctx.db.patch(args.conversationId, {
			lastMessageAt: now,
			lastMessagePreview: preview,
			updatedAt: now,
		})

		// Notify other members
		await ctx.scheduler.runAfter(0, internal.messages.notifyMembers, {
			conversationId: args.conversationId,
			senderId: user.id,
			content: preview,
		})

		// Send email to principal contact
		const client = await ctx.db.get(args.clientId)
		if (client) {
			const principalContact = await ctx.db
				.query("contacts")
				.withIndex("by_client_principal", (q) =>
					q.eq("clientId", args.clientId).eq("isPrincipal", true),
				)
				.first()

			if (principalContact?.email) {
				await ctx.scheduler.runAfter(0, internal.documentRequests.sendDocRequestEmail, {
					email: principalContact.email,
					name: principalContact.nom,
					clientName: client.raisonSociale,
					documentTitle: args.title,
					dueDate: args.dueDate,
				})
			}
		}

		return requestId
	},
})

export const listByConversation = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return []
		const userId = extractUserId(user)

		// Verify membership
		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_user_conversation", (q) =>
				q.eq("userId", userId).eq("conversationId", args.conversationId),
			)
			.first()
		if (!membership) return []

		const requests = await ctx.db
			.query("documentRequests")
			.withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
			.collect()

		return requests.sort((a, b) => b.createdAt - a.createdAt)
	},
})

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return []

		const requests = await ctx.db
			.query("documentRequests")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()

		return requests.sort((a, b) => b.createdAt - a.createdAt)
	},
})

export const getById = query({
	args: { id: v.id("documentRequests") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as BetterAuthUser | undefined
		if (!user) return null

		return await ctx.db.get(args.id)
	},
})

export const respond = mutation({
	args: {
		id: v.id("documentRequests"),
		attachments: v.array(
			v.object({
				storageId: v.string(),
				nom: v.string(),
				mimeType: v.string(),
				fileSize: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()

		const request = await ctx.db.get(args.id)
		if (!request) throw new Error("Demande introuvable")

		await ctx.db.patch(args.id, {
			status: "uploaded",
			attachments: args.attachments,
			respondedById: user.id,
			respondedAt: now,
			updatedAt: now,
		})

		// Create a system message in the conversation
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", user.id))
			.first()
		const senderName = profile?.nom ?? "Quelqu'un"
		const content = `${senderName} a uploadé le document "${request.title}"`

		await ctx.db.insert("messages", {
			conversationId: request.conversationId,
			senderId: user.id,
			content,
			type: "system",
			attachments: args.attachments,
			createdAt: now,
		})

		await ctx.db.patch(request.conversationId, {
			lastMessageAt: now,
			lastMessagePreview: content,
			updatedAt: now,
		})

		// Notify the requester
		await ctx.db.insert("notifications", {
			userId: request.requestedById,
			type: "document_uploaded",
			titre: `Document uploadé : ${request.title}`,
			message: `${senderName} a uploadé le document demandé`,
			lien: `/messages?conversation=${request.conversationId}`,
			relatedId: request._id,
			isRead: false,
			createdAt: now,
		})

		// Send email notification
		const client = await ctx.db.get(request.clientId)
		const requesterProfile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", request.requestedById))
			.first()

		if (requesterProfile?.email && client) {
			await ctx.scheduler.runAfter(0, internal.documentRequests.sendDocUploadedEmail, {
				email: requesterProfile.email,
				name: requesterProfile.nom ?? "Utilisateur",
				clientName: client.raisonSociale,
				documentTitle: request.title,
			})
		}
	},
})

export const updateStatus = mutation({
	args: {
		id: v.id("documentRequests"),
		status: v.union(v.literal("accepted"), v.literal("rejected")),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()

		const request = await ctx.db.get(args.id)
		if (!request) throw new Error("Demande introuvable")

		await ctx.db.patch(args.id, {
			status: args.status,
			responseNote: args.note,
			updatedAt: now,
		})

		// Create a system message
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", user.id))
			.first()
		const senderName = profile?.nom ?? "Quelqu'un"
		const statusLabel = args.status === "accepted" ? "accepté" : "refusé"
		const content = `${senderName} a ${statusLabel} le document "${request.title}"${args.note ? ` — ${args.note}` : ""}`

		await ctx.db.insert("messages", {
			conversationId: request.conversationId,
			senderId: user.id,
			content,
			type: "system",
			createdAt: now,
		})

		await ctx.db.patch(request.conversationId, {
			lastMessageAt: now,
			lastMessagePreview: content,
			updatedAt: now,
		})
	},
})

// Internal actions for sending emails
export const sendDocRequestEmail = internalAction({
	args: {
		email: v.string(),
		name: v.string(),
		clientName: v.string(),
		documentTitle: v.string(),
		dueDate: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		await sendDocumentRequestEmail(args)
	},
})

export const sendDocUploadedEmail = internalAction({
	args: {
		email: v.string(),
		name: v.string(),
		clientName: v.string(),
		documentTitle: v.string(),
	},
	handler: async (_ctx, args) => {
		await sendDocumentUploadedEmail(args)
	},
})
