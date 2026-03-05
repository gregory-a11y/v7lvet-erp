import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const todoStatutValidator = v.union(
	v.literal("a_faire"),
	v.literal("en_cours"),
	v.literal("termine"),
	v.literal("archive"),
)

const todoPrioriteValidator = v.union(
	v.literal("basse"),
	v.literal("normale"),
	v.literal("haute"),
	v.literal("urgente"),
)

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

export const list = query({
	args: {
		statut: v.optional(todoStatutValidator),
		priorite: v.optional(todoPrioriteValidator),
		assigneId: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		categorie: v.optional(v.string()),
		search: v.optional(v.string()),
		includeArchived: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		let todos: Doc<"todos">[]

		// Search mode
		if (args.search?.trim()) {
			const results = await ctx.db
				.query("todos")
				.withSearchIndex("search_titre", (q) => q.search("titre", args.search!))
				.take(200)
			todos = results.filter((t) => !t.parentId)
		} else if (args.assigneId) {
			todos = await ctx.db
				.query("todos")
				.withIndex("by_assigne", (q) => q.eq("assigneId", args.assigneId!))
				.take(500)
			todos = todos.filter((t) => !t.parentId)
		} else if (args.statut) {
			todos = await ctx.db
				.query("todos")
				.withIndex("by_statut", (q) => q.eq("statut", args.statut!))
				.take(500)
			todos = todos.filter((t) => !t.parentId)
		} else if (args.priorite) {
			todos = await ctx.db
				.query("todos")
				.withIndex("by_priorite", (q) => q.eq("priorite", args.priorite!))
				.take(500)
			todos = todos.filter((t) => !t.parentId)
		} else {
			todos = await ctx.db.query("todos").take(500)
			todos = todos.filter((t) => !t.parentId)
		}

		// Exclude archived by default
		if (!args.includeArchived && args.statut !== "archive") {
			todos = todos.filter((t) => t.statut !== "archive")
		}

		// Additional filters
		if (args.clientId) {
			todos = todos.filter((t) => t.clientId === args.clientId)
		}
		if (args.categorie) {
			todos = todos.filter((t) => t.categorie === args.categorie)
		}
		// Cross-filter when primary index wasn't used
		if (args.statut && args.assigneId) {
			todos = todos.filter((t) => t.statut === args.statut)
		}
		if (args.priorite && (args.assigneId || args.statut)) {
			todos = todos.filter((t) => t.priorite === args.priorite)
		}

		// Permission cascade
		if (user.role === "collaborateur") {
			todos = todos.filter((t) => t.assigneId === (user.id as string))
		}

		// Sort by order ASC
		todos.sort((a, b) => a.order - b.order)

		// Batch-fetch client names
		const uniqueClientIds = [...new Set(todos.map((t) => t.clientId).filter(Boolean))]
		const clients = await Promise.all(uniqueClientIds.map((id) => ctx.db.get(id!)))
		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))

		// Count subtasks per todo
		const subtaskCounts = await Promise.all(
			todos.map(async (t) => {
				const subs = await ctx.db
					.query("todos")
					.withIndex("by_parent", (q) => q.eq("parentId", t._id))
					.collect()
				return {
					id: t._id,
					total: subs.length,
					done: subs.filter((s) => s.statut === "termine" || s.statut === "archive").length,
				}
			}),
		)
		const subtaskMap = new Map(subtaskCounts.map((s) => [s.id, s]))

		return todos.map((t) => ({
			...t,
			clientName: t.clientId ? (clientMap.get(t.clientId) ?? "—") : undefined,
			subtasks: subtaskMap.get(t._id) ?? { total: 0, done: 0 },
		}))
	},
})

export const getById = query({
	args: { id: v.id("todos") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const todo = await ctx.db.get(args.id)
		if (!todo) return null

		// Permission cascade
		if (user.role === "collaborateur" && todo.assigneId !== (user.id as string)) {
			return null
		}

		const client = todo.clientId ? await ctx.db.get(todo.clientId) : null

		// Enrich SOPs
		const sops =
			todo.sopIds && todo.sopIds.length > 0
				? await Promise.all(todo.sopIds.map((id) => ctx.db.get(id)))
				: []
		const sopList = sops.filter(Boolean).map((s) => ({ _id: s!._id, nom: s!.nom }))

		// Get subtasks
		const subtasks = await ctx.db
			.query("todos")
			.withIndex("by_parent", (q) => q.eq("parentId", args.id))
			.collect()
		subtasks.sort((a, b) => a.order - b.order)

		return {
			...todo,
			clientName: client?.raisonSociale ?? undefined,
			sopList,
			subtasks,
		}
	},
})

export const stats = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		let todos = await ctx.db.query("todos").take(2000)
		todos = todos.filter((t) => !t.parentId && t.statut !== "archive")

		// Permission cascade
		if (user.role === "collaborateur") {
			todos = todos.filter((t) => t.assigneId === (user.id as string))
		}

		const now = Date.now()
		return {
			aFaire: todos.filter((t) => t.statut === "a_faire").length,
			enCours: todos.filter((t) => t.statut === "en_cours").length,
			termine: todos.filter((t) => t.statut === "termine").length,
			enRetard: todos.filter(
				(t) =>
					t.dateEcheance &&
					t.dateEcheance < now &&
					t.statut !== "termine" &&
					t.statut !== "archive",
			).length,
		}
	},
})

export const myTodos = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		const todos = await ctx.db
			.query("todos")
			.withIndex("by_assigne", (q) => q.eq("assigneId", user.id as string))
			.take(200)

		return todos
			.filter((t) => !t.parentId && t.statut !== "termine" && t.statut !== "archive")
			.sort((a, b) => a.order - b.order)
	},
})

export const listByLead = query({
	args: {
		leadId: v.id("leads"),
		categorie: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Permission check: collaborateur can only see leads they're responsible for
		if (user.role === "collaborateur") {
			const lead = await ctx.db.get(args.leadId)
			if (!lead || (lead.responsableId !== user.id && lead.responsableHierarchiqueId !== user.id)) {
				return []
			}
		}

		let todos = await ctx.db
			.query("todos")
			.withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
			.collect()
		if (args.categorie) {
			todos = todos.filter((t) => t.categorie === args.categorie)
		}
		return todos.sort((a, b) => a.order - b.order)
	},
})

export const onboardingOverview = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		// Get leads in valide or onboarding status
		const valide = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", "valide"))
			.collect()
		const onboarding = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", "onboarding"))
			.collect()
		let leads = [...valide, ...onboarding]

		// Permission cascade: collaborateur sees only leads assigned to them
		if (user.role === "collaborateur") {
			leads = leads.filter(
				(l) => l.responsableId === user.id || l.responsableHierarchiqueId === user.id,
			)
		}

		// For each lead, get onboarding todos + enrich
		const results = await Promise.all(
			leads.map(async (lead) => {
				const todos = await ctx.db
					.query("todos")
					.withIndex("by_lead", (q) => q.eq("leadId", lead._id))
					.collect()
				const onboardingTodos = todos.filter((t) => t.categorie === "onboarding")
				const total = onboardingTodos.length

				// Skip leads with no onboarding todos
				if (total === 0) return null

				const done = onboardingTodos.filter((t) => t.statut === "termine").length

				// Enrich with client/responsable names
				const client = lead.clientId ? await ctx.db.get(lead.clientId) : null

				let responsableNom: string | undefined
				if (lead.responsableId) {
					const profiles = await ctx.db
						.query("userProfiles")
						.withIndex("by_userId", (q) => q.eq("userId", lead.responsableId!))
						.first()
					responsableNom = profiles?.nom ?? undefined
				}

				return {
					leadId: lead._id,
					leadNom: lead.contactNom,
					leadPrenom: lead.contactPrenom,
					entreprise: lead.entrepriseRaisonSociale,
					statut: lead.statut,
					clientId: lead.clientId,
					clientNom: client?.raisonSociale,
					responsableNom,
					total,
					done,
					progress: Math.round((done / total) * 100),
					createdAt: lead.createdAt,
					todos: onboardingTodos.sort((a, b) => a.order - b.order),
				}
			}),
		)

		// Filter out nulls (leads with no onboarding todos)
		return results.filter((r) => r !== null).sort((a, b) => a.progress - b.progress)
	},
})

export const removeOnboardingForLead = mutation({
	args: { leadId: v.id("leads") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Seuls les managers et admins peuvent supprimer un onboarding")
		}

		const todos = await ctx.db
			.query("todos")
			.withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
			.collect()
		const onboardingTodos = todos.filter((t) => t.categorie === "onboarding")

		for (const todo of onboardingTodos) {
			// Delete comments
			const comments = await ctx.db
				.query("todoComments")
				.withIndex("by_todo", (q) => q.eq("todoId", todo._id))
				.collect()
			for (const c of comments) {
				await ctx.db.delete(c._id)
			}
			await ctx.db.delete(todo._id)
		}

		return { deleted: onboardingTodos.length }
	},
})

// ---------------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------------

export const create = mutation({
	args: {
		titre: v.string(),
		description: v.optional(v.string()),
		statut: v.optional(todoStatutValidator),
		priorite: v.optional(todoPrioriteValidator),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
		categorie: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		parentId: v.optional(v.id("todos")),
		tags: v.optional(v.array(v.string())),
		sopIds: v.optional(v.array(v.id("sops"))),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Get max order
		let existing: Doc<"todos">[]
		if (args.parentId) {
			existing = await ctx.db
				.query("todos")
				.withIndex("by_parent", (q) => q.eq("parentId", args.parentId!))
				.collect()
		} else {
			existing = await ctx.db.query("todos").take(1000)
			existing = existing.filter((t) => !t.parentId)
		}
		const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), 0)

		const now = Date.now()
		const todoId = await ctx.db.insert("todos", {
			titre: args.titre,
			description: args.description,
			statut: args.statut ?? "a_faire",
			priorite: args.priorite ?? "normale",
			dateEcheance: args.dateEcheance,
			assigneId: args.assigneId,
			categorie: args.categorie,
			clientId: args.clientId,
			parentId: args.parentId,
			tags: args.tags,
			sopIds: args.sopIds,
			order: maxOrder + 1,
			createdById: user.id as string,
			createdAt: now,
			updatedAt: now,
		})

		// Notification if assigned to someone else
		if (args.assigneId && args.assigneId !== (user.id as string)) {
			await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
				userId: args.assigneId,
				type: "todo_assignee",
				titre: "Nouvelle tâche assignée",
				message: `La tâche "${args.titre}" vous a été assignée.`,
				lien: `/taches/${todoId}`,
				relatedId: `${todoId}_assign`,
			})
		}

		return todoId
	},
})

export const update = mutation({
	args: {
		id: v.id("todos"),
		titre: v.optional(v.string()),
		description: v.optional(v.string()),
		priorite: v.optional(todoPrioriteValidator),
		dateEcheance: v.optional(v.number()),
		assigneId: v.optional(v.string()),
		categorie: v.optional(v.string()),
		clientId: v.optional(v.id("clients")),
		tags: v.optional(v.array(v.string())),
		sopIds: v.optional(v.array(v.id("sops"))),
		attachments: v.optional(
			v.array(
				v.object({
					storageId: v.string(),
					nom: v.string(),
					mimeType: v.optional(v.string()),
					fileSize: v.optional(v.number()),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const before = await ctx.db.get(args.id)
		if (!before) throw new Error("Todo non trouvé")

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		})

		// Notification if assignee changed
		if (
			args.assigneId &&
			before.assigneId !== args.assigneId &&
			args.assigneId !== (user.id as string)
		) {
			const todo = await ctx.db.get(id)
			if (todo) {
				await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
					userId: args.assigneId,
					type: "todo_assignee",
					titre: "Nouvelle tâche assignée",
					message: `La tâche "${todo.titre}" vous a été assignée.`,
					lien: `/taches/${id}`,
					relatedId: `${id}_assign`,
				})
			}
		}
	},
})

export const updateStatut = mutation({
	args: {
		id: v.id("todos"),
		statut: todoStatutValidator,
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		// Collaborateurs can only update their own todos
		if (user.role === "collaborateur") {
			const todo = await ctx.db.get(args.id)
			if (!todo || todo.assigneId !== (user.id as string)) {
				throw new Error("Accès refusé : vous ne pouvez modifier que vos propres tâches")
			}
		}

		const patch: {
			statut: typeof args.statut
			updatedAt: number
			completedAt?: number
		} = {
			statut: args.statut,
			updatedAt: Date.now(),
		}
		if (args.statut === "termine") {
			patch.completedAt = Date.now()
		}

		await ctx.db.patch(args.id, patch)
	},
})

export const remove = mutation({
	args: { id: v.id("todos") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Seuls les managers et admins peuvent supprimer une tâche")
		}

		// Delete subtasks
		const subtasks = await ctx.db
			.query("todos")
			.withIndex("by_parent", (q) => q.eq("parentId", args.id))
			.collect()
		for (const sub of subtasks) {
			// Delete subtask comments
			const subComments = await ctx.db
				.query("todoComments")
				.withIndex("by_todo", (q) => q.eq("todoId", sub._id))
				.collect()
			for (const c of subComments) {
				await ctx.db.delete(c._id)
			}
			await ctx.db.delete(sub._id)
		}

		// Delete comments
		const comments = await ctx.db
			.query("todoComments")
			.withIndex("by_todo", (q) => q.eq("todoId", args.id))
			.collect()
		for (const c of comments) {
			await ctx.db.delete(c._id)
		}

		await ctx.db.delete(args.id)
	},
})

export const reorder = mutation({
	args: {
		id: v.id("todos"),
		newOrder: v.number(),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		await ctx.db.patch(args.id, { order: args.newOrder, updatedAt: Date.now() })
	},
})

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.storage.generateUploadUrl()
	},
})

// ---------------------------------------------------------------------------
// ARCHIVAGE AUTO — cron job
// ---------------------------------------------------------------------------

export const archiveOldCompleted = internalMutation({
	args: {},
	handler: async (ctx) => {
		const cutoff = Date.now() - ONE_MONTH_MS

		// Fetch completed todos
		const completed = await ctx.db
			.query("todos")
			.withIndex("by_statut", (q) => q.eq("statut", "termine"))
			.take(500)

		let archived = 0
		for (const todo of completed) {
			if (todo.completedAt && todo.completedAt < cutoff) {
				await ctx.db.patch(todo._id, { statut: "archive", updatedAt: Date.now() })
				archived++

				// Also archive subtasks
				const subtasks = await ctx.db
					.query("todos")
					.withIndex("by_parent", (q) => q.eq("parentId", todo._id))
					.collect()
				for (const sub of subtasks) {
					if (sub.statut === "termine") {
						await ctx.db.patch(sub._id, { statut: "archive", updatedAt: Date.now() })
					}
				}
			}
		}

		return { archived }
	},
})
