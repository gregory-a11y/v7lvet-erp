import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const ticketStatusValidator = v.union(
	v.literal("ouvert"),
	v.literal("en_cours"),
	v.literal("resolu"),
	v.literal("ferme"),
)

const ticketPrioriteValidator = v.union(
	v.literal("basse"),
	v.literal("normale"),
	v.literal("haute"),
	v.literal("urgente"),
)

export const list = query({
	args: {
		clientId: v.optional(v.id("clients")),
		status: v.optional(ticketStatusValidator),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (!user) return []

		let tickets: Doc<"tickets">[]

		if (args.clientId) {
			tickets = await ctx.db
				.query("tickets")
				.withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
				.collect()
		} else if (args.status) {
			const status = args.status
			tickets = await ctx.db
				.query("tickets")
				.withIndex("by_status", (q) => q.eq("status", status))
				.collect()
		} else if (args.assigneId) {
			tickets = await ctx.db
				.query("tickets")
				.withIndex("by_assigne", (q) => q.eq("assigneId", args.assigneId!))
				.collect()
		} else {
			tickets = await ctx.db.query("tickets").collect()
		}

		// Additional filters
		if (args.status && args.clientId) {
			tickets = tickets.filter((t) => t.status === args.status)
		}

		// Permission cascade
		if (user.role === "manager") {
			const managerId = user.id
			const clients = await ctx.db
				.query("clients")
				.withIndex("by_manager", (q) => q.eq("managerId", managerId))
				.collect()
			const clientIds = new Set(clients.map((c) => c._id))
			tickets = tickets.filter((t) => clientIds.has(t.clientId))
		} else if (user.role === "collaborateur") {
			tickets = tickets.filter((t) => t.assigneId === user.id || t.createdById === user.id)
		}

		// Batch-fetch clients (avoid N+1)
		const uniqueClientIds = [...new Set(tickets.map((t) => t.clientId))]
		const clients = await Promise.all(uniqueClientIds.map((id) => ctx.db.get(id)))
		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))

		const enriched = tickets.map((t) => ({
			...t,
			clientName: clientMap.get(t.clientId) ?? "—",
		}))

		// Sort by creation (newest first)
		enriched.sort((a, b) => b.createdAt - a.createdAt)
		return enriched
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		ticketTypeId: v.optional(v.id("ticketTypes")),
		titre: v.string(),
		description: v.optional(v.string()),
		priorite: ticketPrioriteValidator,
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const now = Date.now()
		const ticketId = await ctx.db.insert("tickets", {
			clientId: args.clientId,
			ticketTypeId: args.ticketTypeId,
			titre: args.titre,
			description: args.description,
			status: "ouvert",
			priorite: args.priorite,
			assigneId: args.assigneId,
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})

		// Notifier l'assigné
		if (args.assigneId) {
			await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
				userId: args.assigneId,
				type: "ticket_cree",
				titre: "Nouveau ticket assigné",
				message: `Le ticket "${args.titre}" vous a été assigné.`,
				lien: `/tickets/${ticketId}`,
				relatedId: `${ticketId}_created`,
			})
		}

		return ticketId
	},
})

export const updateStatus = mutation({
	args: {
		id: v.id("tickets"),
		status: ticketStatusValidator,
		resolution: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error(
				"Accès refusé : seuls les managers et admins peuvent changer le statut d'un ticket",
			)
		}

		const patch: {
			status: typeof args.status
			updatedAt: number
			resolvedAt?: number
			resolution?: string
		} = {
			status: args.status,
			updatedAt: Date.now(),
		}
		if (args.status === "resolu" || args.status === "ferme") {
			patch.resolvedAt = Date.now()
			if (args.resolution) patch.resolution = args.resolution
		}

		await ctx.db.patch(args.id, patch)
	},
})

export const remove = mutation({
	args: { id: v.id("tickets") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})

// Ticket types
export const listTypes = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (!user) return []
		return ctx.db.query("ticketTypes").collect()
	},
})

export const createType = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		couleur: v.optional(v.string()),
		icone: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		return ctx.db.insert("ticketTypes", {
			...args,
			isActive: true,
			createdAt: Date.now(),
		})
	},
})

export const removeType = mutation({
	args: { id: v.id("ticketTypes") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})
