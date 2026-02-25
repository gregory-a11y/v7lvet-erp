import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: {
		runId: v.optional(v.id("runs")),
		clientId: v.optional(v.id("clients")),
		status: v.optional(v.string()),
		type: v.optional(v.string()),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		let taches: Doc<"taches">[]

		if (args.runId) {
			taches = await ctx.db
				.query("taches")
				.withIndex("by_run", (q) => q.eq("runId", args.runId!))
				.collect()
		} else if (args.assigneId) {
			taches = await ctx.db
				.query("taches")
				.withIndex("by_assigne", (q) => q.eq("assigneId", args.assigneId!))
				.collect()
		} else if (args.status) {
			taches = await ctx.db
				.query("taches")
				.withIndex("by_status", (q) => q.eq("status", args.status as any))
				.collect()
		} else {
			taches = await ctx.db.query("taches").collect()
		}

		// Apply additional filters
		if (args.clientId) {
			taches = taches.filter((t) => t.clientId === args.clientId)
		}
		if (args.type) {
			taches = taches.filter((t) => t.type === args.type)
		}
		if (args.status && args.runId) {
			taches = taches.filter((t) => t.status === args.status)
		}

		// Permission cascade
		if (user.role === "collaborateur") {
			taches = taches.filter((t) => t.assigneId === (user.id as string))
		} else if (user.role === "manager") {
			const clients = await ctx.db
				.query("clients")
				.withIndex("by_manager", (q) => q.eq("managerId", user.id as string))
				.collect()
			const clientIds = new Set(clients.map((c) => c._id))
			taches = taches.filter((t) => clientIds.has(t.clientId))
		} else if (user.role === "assistante") {
			taches = []
		}

		// Sort by dateEcheance ASC (nulls last)
		taches.sort((a, b) => {
			if (!a.dateEcheance && !b.dateEcheance) return 0
			if (!a.dateEcheance) return 1
			if (!b.dateEcheance) return -1
			return a.dateEcheance - b.dateEcheance
		})

		// Enrich with client name
		const enriched = await Promise.all(
			taches.map(async (t) => {
				const client = await ctx.db.get(t.clientId)
				return {
					...t,
					clientName: client?.raisonSociale ?? "—",
				}
			}),
		)

		return enriched
	},
})

export const getById = query({
	args: { id: v.id("taches") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const tache = await ctx.db.get(args.id)
		if (!tache) return null

		const client = await ctx.db.get(tache.clientId)
		const run = await ctx.db.get(tache.runId)

		return {
			...tache,
			clientName: client?.raisonSociale ?? "—",
			client,
			run,
		}
	},
})

export const listByRun = query({
	args: { runId: v.id("runs") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const taches = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", args.runId))
			.collect()

		taches.sort((a, b) => {
			if (!a.dateEcheance && !b.dateEcheance) return 0
			if (!a.dateEcheance) return 1
			if (!b.dateEcheance) return -1
			return a.dateEcheance - b.dateEcheance
		})

		return taches
	},
})

export const stats = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		let taches = await ctx.db.query("taches").collect()

		// Permission cascade
		if (user.role === "collaborateur") {
			taches = taches.filter((t) => t.assigneId === (user.id as string))
		} else if (user.role === "manager") {
			const clients = await ctx.db
				.query("clients")
				.withIndex("by_manager", (q) => q.eq("managerId", user.id as string))
				.collect()
			const clientIds = new Set(clients.map((c) => c._id))
			taches = taches.filter((t) => clientIds.has(t.clientId))
		} else if (user.role === "assistante") {
			taches = []
		}

		const now = Date.now()
		return {
			total: taches.length,
			aVenir: taches.filter((t) => t.status === "a_venir").length,
			enCours: taches.filter((t) => t.status === "en_cours").length,
			enAttente: taches.filter((t) => t.status === "en_attente").length,
			termine: taches.filter((t) => t.status === "termine").length,
			enRetard: taches.filter(
				(t) => t.dateEcheance && t.dateEcheance < now && t.status !== "termine",
			).length,
		}
	},
})

export const create = mutation({
	args: {
		runId: v.id("runs"),
		nom: v.string(),
		categorie: v.optional(v.string()),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const run = await ctx.db.get(args.runId)
		if (!run) throw new Error("Run non trouvé")

		// Get max order for this run
		const existing = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", args.runId))
			.collect()
		const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), 0)

		const now = Date.now()
		return ctx.db.insert("taches", {
			runId: args.runId,
			clientId: run.clientId,
			nom: args.nom,
			type: "operationnelle" as any,
			categorie: args.categorie ?? "AUTRE",
			dateEcheance: args.dateEcheance,
			assigneId: args.assigneId,
			notes: args.notes,
			status: "a_venir" as any,
			order: maxOrder + 1,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("taches"),
		nom: v.optional(v.string()),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const before = await ctx.db.get(args.id)
		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		})

		// Trigger notification si un assigné vient d'être ajouté/changé
		if (args.assigneId && before?.assigneId !== args.assigneId) {
			const tache = await ctx.db.get(id)
			if (tache) {
				await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
					userId: args.assigneId,
					type: "tache_assignee",
					titre: "Nouvelle tâche assignée",
					message: `La tâche "${tache.nom}" vous a été assignée.`,
					lien: `/taches/${id}`,
					relatedId: `${id}_assign`,
				})
			}
		}
	},
})

export const updateStatus = mutation({
	args: {
		id: v.id("taches"),
		status: v.string(),
	},
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const patch: Record<string, unknown> = {
			status: args.status,
			updatedAt: Date.now(),
		}
		if (args.status === "termine") {
			patch.completedAt = Date.now()
		}

		await ctx.db.patch(args.id, patch as any)
	},
})

export const remove = mutation({
	args: { id: v.id("taches") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "associe") throw new Error("Seul un associé peut supprimer une tâche")

		await ctx.db.delete(args.id)
	},
})

export const listForGantt = query({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		clientId: v.optional(v.id("clients")),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)

		const taches = await ctx.db.query("taches").withIndex("by_echeance").collect()

		return taches.filter((t) => {
			if (!t.dateEcheance) return false
			if (t.dateEcheance < args.startDate || t.dateEcheance > args.endDate) return false
			if (args.clientId && t.clientId !== args.clientId) return false
			if (args.assigneId && t.assigneId !== args.assigneId) return false
			return true
		})
	},
})
