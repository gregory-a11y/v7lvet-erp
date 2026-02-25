import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { authComponent } from "./auth"

export const list = query({
	args: {
		clientId: v.optional(v.id("clients")),
		status: v.optional(v.string()),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		let tickets: Doc<"tickets">[]

		if (args.clientId) {
			tickets = await ctx.db.query("tickets").withIndex("by_client", (q) => q.eq("clientId", args.clientId!)).collect()
		} else if (args.status) {
			tickets = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", args.status as any)).collect()
		} else if (args.assigneId) {
			tickets = await ctx.db.query("tickets").withIndex("by_assigne", (q) => q.eq("assigneId", args.assigneId!)).collect()
		} else {
			tickets = await ctx.db.query("tickets").collect()
		}

		// Additional filters
		if (args.status && args.clientId) {
			tickets = tickets.filter((t) => t.status === args.status)
		}

		// Permission cascade
		if (user.role === "manager") {
			const clients = await ctx.db.query("clients").withIndex("by_manager", (q) => q.eq("managerId", user.id as string)).collect()
			const clientIds = new Set(clients.map((c) => c._id))
			tickets = tickets.filter((t) => clientIds.has(t.clientId))
		} else if (user.role === "collaborateur") {
			tickets = tickets.filter((t) => t.assigneId === (user.id as string) || t.createdById === (user.id as string))
		} else if (user.role === "assistante") {
			tickets = []
		}

		// Enrich with client name
		const enriched = await Promise.all(
			tickets.map(async (t) => {
				const client = await ctx.db.get(t.clientId)
				return { ...t, clientName: client?.raisonSociale ?? "—" }
			}),
		)

		// Sort by creation (newest first)
		enriched.sort((a, b) => b.createdAt - a.createdAt)
		return enriched
	},
})

export const getById = query({
	args: { id: v.id("tickets") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null

		const ticket = await ctx.db.get(args.id)
		if (!ticket) return null

		const client = await ctx.db.get(ticket.clientId)
		return { ...ticket, clientName: client?.raisonSociale ?? "—" }
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		ticketTypeId: v.optional(v.id("ticketTypes")),
		titre: v.string(),
		description: v.optional(v.string()),
		priorite: v.string(),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const now = Date.now()
		return ctx.db.insert("tickets", {
			clientId: args.clientId,
			ticketTypeId: args.ticketTypeId,
			titre: args.titre,
			description: args.description,
			status: "ouvert",
			priorite: args.priorite as any,
			assigneId: args.assigneId,
			createdById: user.id as string,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("tickets"),
		titre: v.optional(v.string()),
		description: v.optional(v.string()),
		priorite: v.optional(v.string()),
		assigneId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			priorite: updates.priorite as any,
			updatedAt: Date.now(),
		})
	},
})

export const updateStatus = mutation({
	args: {
		id: v.id("tickets"),
		status: v.string(),
		resolution: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const patch: Record<string, unknown> = {
			status: args.status,
			updatedAt: Date.now(),
		}
		if (args.status === "resolu" || args.status === "ferme") {
			patch.resolvedAt = Date.now()
			if (args.resolution) patch.resolution = args.resolution
		}

		await ctx.db.patch(args.id, patch as any)
	},
})

export const remove = mutation({
	args: { id: v.id("tickets") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})

// Ticket types
export const listTypes = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
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
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")

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
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Non autorisé")
		await ctx.db.delete(args.id)
	},
})
