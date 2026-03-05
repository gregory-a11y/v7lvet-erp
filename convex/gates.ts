import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { canAccessClient, getAuthUserWithRole } from "./auth"

export const listPending = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		let gates: Doc<"gates">[]
		if (user.role === "admin") {
			gates = await ctx.db
				.query("gates")
				.withIndex("by_status", (q) => q.eq("status", "en_attente"))
				.collect()
		} else {
			gates = await ctx.db
				.query("gates")
				.withIndex("by_responsable_status", (q) =>
					q.eq("responsableId", user.id).eq("status", "en_attente"),
				)
				.collect()
		}

		// Collect unique userIds for batch lookup
		const userIds = new Set<string>()
		for (const gate of gates) {
			userIds.add(gate.responsableId)
		}

		// Enrich with tache + client
		const enriched = await Promise.all(
			gates.map(async (gate) => {
				const tache = await ctx.db.get(gate.tacheId)
				const client = await ctx.db.get(gate.clientId)
				if (tache?.assigneId) userIds.add(tache.assigneId)
				return { gate, tache, client }
			}),
		)

		// Batch-fetch user profiles
		const profiles = await Promise.all(
			[...userIds].map((userId) =>
				ctx.db
					.query("userProfiles")
					.withIndex("by_userId", (q) => q.eq("userId", userId))
					.first(),
			),
		)
		const profileMap = new Map(
			profiles.filter(Boolean).map((p) => [p!.userId, p!.nom ?? p!.email ?? "—"]),
		)

		return enriched.map(({ gate, tache, client }) => ({
			...gate,
			tacheNom: tache?.nom ?? "—",
			tacheCategorie: tache?.categorie,
			tacheDateEcheance: tache?.dateEcheance,
			tacheAssigneId: tache?.assigneId,
			tacheAssigneNom: tache?.assigneId ? (profileMap.get(tache.assigneId) ?? "—") : undefined,
			responsableNom: profileMap.get(gate.responsableId) ?? "—",
			clientName: client?.raisonSociale ?? "—",
		}))
	},
})

export const listByRun = query({
	args: { runId: v.id("runs") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Permission check via run's client
		const run = await ctx.db.get(args.runId)
		if (!run || !(await canAccessClient(ctx, user, run.clientId))) return []

		const gates = await ctx.db
			.query("gates")
			.withIndex("by_run", (q) => q.eq("runId", args.runId))
			.collect()

		const enriched = await Promise.all(
			gates.map(async (gate) => {
				const tache = await ctx.db.get(gate.tacheId)
				return {
					...gate,
					tacheNom: tache?.nom ?? "—",
				}
			}),
		)

		return enriched
	},
})

export const getByTache = query({
	args: { tacheId: v.id("taches") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Permission check via tache's client
		const tache = await ctx.db.get(args.tacheId)
		if (!tache || !(await canAccessClient(ctx, user, tache.clientId))) return null

		return ctx.db
			.query("gates")
			.withIndex("by_tache", (q) => q.eq("tacheId", args.tacheId))
			.order("desc")
			.first()
	},
})

export const pendingCount = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		let gates: Doc<"gates">[]
		if (user.role === "admin") {
			gates = await ctx.db
				.query("gates")
				.withIndex("by_status", (q) => q.eq("status", "en_attente"))
				.collect()
		} else {
			gates = await ctx.db
				.query("gates")
				.withIndex("by_responsable_status", (q) =>
					q.eq("responsableId", user.id).eq("status", "en_attente"),
				)
				.collect()
		}

		return gates.length
	},
})

export const validate = mutation({
	args: {
		id: v.id("gates"),
		commentaire: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const gate = await ctx.db.get(args.id)
		if (!gate) throw new Error("Gate non trouvée")
		if (gate.status !== "en_attente") throw new Error("Cette gate a déjà été traitée")

		// Only the responsible or admin can validate
		if (user.role !== "admin" && gate.responsableId !== user.id) {
			throw new Error("Seul le responsable hiérarchique ou un admin peut valider cette gate")
		}

		const now = Date.now()

		// Update gate
		await ctx.db.patch(args.id, {
			status: "validee",
			validePar: user.id,
			commentaire: args.commentaire,
			updatedAt: now,
		})

		// Update tache → termine
		await ctx.db.patch(gate.tacheId, {
			status: "termine",
			completedAt: now,
			updatedAt: now,
		})

		// Notify the collaborateur
		const tache = await ctx.db.get(gate.tacheId)
		if (tache?.assigneId) {
			await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
				userId: tache.assigneId,
				type: "gate_validee",
				titre: "Tâche validée",
				message: `La tâche "${tache.nom}" a été validée par votre responsable.`,
				lien: `/runs/${gate.runId}`,
				relatedId: `gate_${args.id}_validee`,
			})
		}
	},
})

export const reject = mutation({
	args: {
		id: v.id("gates"),
		commentaire: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const gate = await ctx.db.get(args.id)
		if (!gate) throw new Error("Gate non trouvée")
		if (gate.status !== "en_attente") throw new Error("Cette gate a déjà été traitée")

		if (user.role !== "admin" && gate.responsableId !== user.id) {
			throw new Error("Seul le responsable hiérarchique ou un admin peut rejeter cette gate")
		}

		const tache = await ctx.db.get(gate.tacheId)
		if (!tache) throw new Error("Tâche non trouvée")

		const now = Date.now()

		// Update tache → en_revision
		await ctx.db.patch(gate.tacheId, {
			status: "en_revision",
			updatedAt: now,
		})

		// Get max order for this run
		const existing = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", gate.runId))
			.collect()
		const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), 0)

		// Create revision task assigned to the original collaborateur
		const revisionId = await ctx.db.insert("taches", {
			runId: gate.runId,
			clientId: gate.clientId,
			nom: `Révision: ${tache.nom}`,
			type: "operationnelle",
			status: "a_faire",
			assigneId: tache.assigneId,
			categorie: tache.categorie,
			dateEcheance: tache.dateEcheance,
			order: maxOrder + 1,
			notes: `Motif du rejet: ${args.commentaire}`,
			createdAt: now,
			updatedAt: now,
		})

		// Update gate
		await ctx.db.patch(args.id, {
			status: "rejetee",
			validePar: user.id,
			commentaire: args.commentaire,
			tacheRevisionId: revisionId,
			updatedAt: now,
		})

		// Notify the collaborateur
		if (tache.assigneId) {
			await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
				userId: tache.assigneId,
				type: "gate_rejetee",
				titre: "Tâche rejetée",
				message: `La tâche "${tache.nom}" a été rejetée. Motif: ${args.commentaire}`,
				lien: `/runs/${gate.runId}`,
				relatedId: `gate_${args.id}_rejetee`,
			})
		}
	},
})
