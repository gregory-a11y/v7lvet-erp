import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole, safeGetAuthUserWithRole } from "./auth"

const tacheStatusValidator = v.union(
	v.literal("a_faire"),
	v.literal("en_attente"),
	v.literal("en_verification"),
	v.literal("en_revision"),
	v.literal("termine"),
	// Legacy statuses — backward compat with prod data
	v.literal("a_venir"),
	v.literal("en_cours"),
)

export const list = query({
	args: {
		runId: v.optional(v.id("runs")),
		clientId: v.optional(v.id("clients")),
		status: v.optional(tacheStatusValidator),
		type: v.optional(v.string()),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		let taches: Doc<"taches">[]

		if (args.runId) {
			taches = await ctx.db
				.query("taches")
				.withIndex("by_run", (q) => q.eq("runId", args.runId!))
				.take(500)
		} else if (args.assigneId) {
			taches = await ctx.db
				.query("taches")
				.withIndex("by_assigne", (q) => q.eq("assigneId", args.assigneId!))
				.take(500)
		} else if (args.status) {
			const status = args.status
			taches = await ctx.db
				.query("taches")
				.withIndex("by_status", (q) => q.eq("status", status))
				.take(500)
		} else {
			taches = await ctx.db.query("taches").take(500)
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
			const clientsByOp = await ctx.db
				.query("clients")
				.withIndex("by_responsable_op", (q) => q.eq("responsableOperationnelId", user.id as string))
				.take(200)
			const clientsByH = await ctx.db
				.query("clients")
				.withIndex("by_responsable_h", (q) => q.eq("responsableHierarchiqueId", user.id as string))
				.take(200)
			const clientIds = new Set([...clientsByOp, ...clientsByH].map((c) => c._id))
			taches = taches.filter((t) => clientIds.has(t.clientId))
		}

		// Sort by dateEcheance ASC (nulls last)
		taches.sort((a, b) => {
			if (!a.dateEcheance && !b.dateEcheance) return 0
			if (!a.dateEcheance) return 1
			if (!b.dateEcheance) return -1
			return a.dateEcheance - b.dateEcheance
		})

		// Batch-fetch clients (avoid N+1)
		const uniqueClientIds = [...new Set(taches.map((t) => t.clientId))]
		const clients = await Promise.all(uniqueClientIds.map((id) => ctx.db.get(id)))
		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))

		const enriched = taches.map((t) => ({
			...t,
			clientName: clientMap.get(t.clientId) ?? "—",
		}))

		return enriched
	},
})

export const getById = query({
	args: { id: v.id("taches") },
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null

		const tache = await ctx.db.get(args.id)
		if (!tache) return null

		// Permission cascade
		if (user.role === "collaborateur" && tache.assigneId !== (user.id as string)) {
			return null
		} else if (user.role === "manager") {
			const client = await ctx.db.get(tache.clientId)
			if (
				client &&
				client.responsableOperationnelId !== (user.id as string) &&
				client.responsableHierarchiqueId !== (user.id as string)
			) {
				return null
			}
		}

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

export const stats = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null

		let taches = await ctx.db.query("taches").take(2000)

		// Permission cascade
		if (user.role === "collaborateur") {
			taches = taches.filter((t) => t.assigneId === (user.id as string))
		} else if (user.role === "manager") {
			const clientsByOp = await ctx.db
				.query("clients")
				.withIndex("by_responsable_op", (q) => q.eq("responsableOperationnelId", user.id as string))
				.take(200)
			const clientsByH = await ctx.db
				.query("clients")
				.withIndex("by_responsable_h", (q) => q.eq("responsableHierarchiqueId", user.id as string))
				.take(200)
			const clientIds = new Set([...clientsByOp, ...clientsByH].map((c) => c._id))
			taches = taches.filter((t) => clientIds.has(t.clientId))
		}

		const now = Date.now()
		return {
			total: taches.length,
			aFaire: taches.filter((t) => t.status === "a_faire").length,
			enAttente: taches.filter((t) => t.status === "en_attente").length,
			enVerification: taches.filter((t) => t.status === "en_verification").length,
			enRevision: taches.filter((t) => t.status === "en_revision").length,
			termine: taches.filter((t) => t.status === "termine").length,
			enRetard: taches.filter(
				(t) =>
					t.dateEcheance &&
					t.dateEcheance < now &&
					t.status !== "termine" &&
					t.status !== "en_verification",
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
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent créer une tâche")
		}

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
			type: "operationnelle",
			categorie: args.categorie ?? "AUTRE",
			dateEcheance: args.dateEcheance,
			assigneId: args.assigneId,
			notes: args.notes,
			status: "a_faire",
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
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent modifier une tâche")
		}

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
		status: tacheStatusValidator,
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const tache = await ctx.db.get(args.id)
		if (!tache) throw new ConvexError("Tâche non trouvée")

		// Collaborateurs can only update their own tasks
		if (user.role === "collaborateur") {
			if (tache.assigneId !== user.id) {
				throw new ConvexError("Accès refusé : vous ne pouvez modifier que vos propres tâches")
			}
		}

		// Gate logic: any user marking a gate-required task as "termine" triggers verification
		if (args.status === "termine" && tache.requiresGate === true) {
			// Check no pending gate already exists
			const existingGate = await ctx.db
				.query("gates")
				.withIndex("by_tache", (q) => q.eq("tacheId", args.id))
				.collect()
			const hasPending = existingGate.some((g) => g.status === "en_attente")
			if (hasPending) {
				throw new ConvexError("Une vérification est déjà en attente pour cette tâche")
			}

			// Get client to find responsableHierarchiqueId
			const client = await ctx.db.get(tache.clientId)
			if (!client?.responsableHierarchiqueId) {
				throw new ConvexError(
					"Impossible de créer la gate : aucun responsable hiérarchique assigné à ce client",
				)
			}

			const now = Date.now()

			// Create gate
			const gateId = await ctx.db.insert("gates", {
				tacheId: args.id,
				runId: tache.runId,
				clientId: tache.clientId,
				status: "en_attente",
				responsableId: client.responsableHierarchiqueId,
				createdAt: now,
				updatedAt: now,
			})

			// Set tache to en_verification
			await ctx.db.patch(args.id, {
				status: "en_verification",
				updatedAt: now,
			})

			// Notify responsable
			await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
				userId: client.responsableHierarchiqueId,
				type: "gate_en_attente",
				titre: "Vérification requise",
				message: `La tâche "${tache.nom}" (${client.raisonSociale}) nécessite votre validation.`,
				lien: "/gate",
				relatedId: `gate_${gateId}_pending`,
			})

			return
		}

		const patch: {
			status: typeof args.status
			updatedAt: number
			completedAt?: number
		} = {
			status: args.status,
			updatedAt: Date.now(),
		}
		if (args.status === "termine") {
			patch.completedAt = Date.now()
		}

		await ctx.db.patch(args.id, patch)
	},
})

export const remove = mutation({
	args: { id: v.id("taches") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer une tâche")

		// Delete associated gates
		const gates = await ctx.db
			.query("gates")
			.withIndex("by_tache", (q) => q.eq("tacheId", args.id))
			.collect()
		for (const g of gates) await ctx.db.delete(g._id)

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
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		const taches = await ctx.db.query("taches").withIndex("by_echeance").take(500)

		// Build accessible client set for permission filtering
		let accessibleClientIds: Set<string> | null = null
		if (user.role === "manager") {
			const clients = await ctx.db.query("clients").take(500)
			accessibleClientIds = new Set(
				clients
					.filter(
						(c) =>
							c.responsableOperationnelId === (user.id as string) ||
							c.responsableHierarchiqueId === (user.id as string),
					)
					.map((c) => c._id),
			)
		} else if (user.role === "collaborateur") {
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
				.take(500)
			accessibleClientIds = new Set(dossiers.map((d) => d.clientId))
		}

		return taches.filter((t) => {
			if (!t.dateEcheance) return false
			if (t.dateEcheance < args.startDate || t.dateEcheance > args.endDate) return false
			if (args.clientId && t.clientId !== args.clientId) return false
			if (args.assigneId && t.assigneId !== args.assigneId) return false
			if (accessibleClientIds && !accessibleClientIds.has(t.clientId)) return false
			return true
		})
	},
})

export const listForGanttEnriched = query({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		clientId: v.optional(v.id("clients")),
		categorie: v.optional(v.string()),
		status: v.optional(v.string()),
		exercice: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		let taches = await ctx.db.query("taches").withIndex("by_echeance").take(500)

		// Build accessible client set for permission filtering
		let accessibleClientIds: Set<string> | null = null
		if (user.role === "manager") {
			const clients = await ctx.db.query("clients").take(500)
			accessibleClientIds = new Set(
				clients
					.filter(
						(c) =>
							c.responsableOperationnelId === (user.id as string) ||
							c.responsableHierarchiqueId === (user.id as string),
					)
					.map((c) => c._id),
			)
		} else if (user.role === "collaborateur") {
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", user.id as string))
				.take(500)
			accessibleClientIds = new Set(dossiers.map((d) => d.clientId))
		}

		// When exercice is provided, filter by run exercice (skip date range filter
		// because fiscal tasks often have due dates in the following calendar year)
		if (args.exercice) {
			const runIds = new Set<string>()
			const runs = await ctx.db.query("runs").take(1000)
			for (const r of runs) {
				if (r.exercice === args.exercice) runIds.add(r._id)
			}
			taches = taches.filter((t) => {
				if (!t.dateEcheance) return false
				if (!runIds.has(t.runId)) return false
				if (args.clientId && t.clientId !== args.clientId) return false
				if (args.categorie && t.categorie !== args.categorie) return false
				if (args.status && t.status !== args.status) return false
				if (accessibleClientIds && !accessibleClientIds.has(t.clientId)) return false
				return true
			})
		} else {
			taches = taches.filter((t) => {
				if (!t.dateEcheance) return false
				if (t.dateEcheance < args.startDate || t.dateEcheance > args.endDate) return false
				if (args.clientId && t.clientId !== args.clientId) return false
				if (args.categorie && t.categorie !== args.categorie) return false
				if (args.status && t.status !== args.status) return false
				if (accessibleClientIds && !accessibleClientIds.has(t.clientId)) return false
				return true
			})
		}

		// Batch-fetch client names
		const uniqueClientIds = [...new Set(taches.map((t) => t.clientId))]
		const clients = await Promise.all(uniqueClientIds.map((id) => ctx.db.get(id)))
		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))

		return taches.map((t) => ({
			...t,
			clientName: clientMap.get(t.clientId) ?? "—",
		}))
	},
})
