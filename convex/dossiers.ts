import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { authComponent } from "./auth"

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		const dossiers = await ctx.db
			.query("dossiers")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()

		// Permission cascade
		if (user.role === "collaborateur") {
			return dossiers.filter((d) => d.collaborateurId === (user.id as string))
		}
		if (user.role === "manager") {
			return dossiers.filter((d) => d.managerId === (user.id as string))
		}
		if (user.role === "assistante") {
			return []
		}

		return dossiers
	},
})

export const getById = query({
	args: { id: v.id("dossiers") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null

		const dossier = await ctx.db.get(args.id)
		if (!dossier) return null

		return dossier
	},
})

export const listByCollaborateur = query({
	args: { collaborateurId: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		return ctx.db
			.query("dossiers")
			.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", args.collaborateurId))
			.collect()
	},
})

export const listByManager = query({
	args: { managerId: v.string() },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		return ctx.db
			.query("dossiers")
			.withIndex("by_manager", (q) => q.eq("managerId", args.managerId))
			.collect()
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		nom: v.string(),
		type: v.string(),
		exercice: v.optional(v.string()),
		managerId: v.optional(v.string()),
		collaborateurId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client non trouvé")

		// Associé ou manager du client
		if (user.role !== "associe" && client.managerId !== (user.id as string)) {
			throw new Error("Non autorisé")
		}

		const now = Date.now()
		return ctx.db.insert("dossiers", {
			clientId: args.clientId,
			nom: args.nom,
			type: args.type as any,
			exercice: args.exercice,
			managerId: args.managerId,
			collaborateurId: args.collaborateurId,
			notes: args.notes,
			status: "actif",
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("dossiers"),
		nom: v.optional(v.string()),
		type: v.optional(v.string()),
		exercice: v.optional(v.string()),
		managerId: v.optional(v.string()),
		collaborateurId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")

		const dossier = await ctx.db.get(args.id)
		if (!dossier) throw new Error("Dossier non trouvé")

		// Associé ou manager du dossier
		if (user.role !== "associe" && dossier.managerId !== (user.id as string)) {
			throw new Error("Non autorisé")
		}

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			type: updates.type as any,
			updatedAt: Date.now(),
		})
	},
})

export const archive = mutation({
	args: { id: v.id("dossiers") },
	handler: async (ctx, args) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		if (user.role !== "associe") throw new Error("Seul un associé peut archiver un dossier")

		await ctx.db.patch(args.id, {
			status: "archive" as any,
			updatedAt: Date.now(),
		})
	},
})
