import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, mutation, query } from "./_generated/server"
import { authComponent, getAuthUserWithRole } from "./auth"

export const listForUser = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		const userId = (user._id as string) || (user.id as string)
		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", userId))
			.order("desc")
			.take(50)

		notifications.sort((a, b) => b.createdAt - a.createdAt)
		return notifications
	},
})

export const unreadCount = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return 0

		const userId = (user._id as string) || (user.id as string)
		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", userId).eq("isRead", false))
			.collect()

		return unread.length
	},
})

export const markAsRead = mutation({
	args: { id: v.id("notifications") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) throw new Error("Non authentifié")
		const userId = (user._id as string) || (user.id as string)

		const notif = await ctx.db.get(args.id)
		if (!notif || notif.userId !== userId) throw new Error("Non autorisé")

		await ctx.db.patch(args.id, { isRead: true })
	},
})

export const markAllAsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_user_read", (q) => q.eq("userId", user.id as string).eq("isRead", false))
			.collect()

		await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })))
	},
})

// ---------------------------------------------------------------------------
// Internal: insérer une notif sans doublon (utilisé par crons + triggers)
// ---------------------------------------------------------------------------
export const insertIfNotDuplicate = internalMutation({
	args: {
		userId: v.string(),
		type: v.union(
			v.literal("echeance_proche"),
			v.literal("echeance_depassee"),
			v.literal("ticket_cree"),
			v.literal("tache_assignee"),
			v.literal("nouveau_message"),
			v.literal("mention"),
		),
		titre: v.string(),
		message: v.string(),
		lien: v.optional(v.string()),
		relatedId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.relatedId) {
			const existing = await ctx.db
				.query("notifications")
				.withIndex("by_related_type", (q) =>
					q.eq("relatedId", args.relatedId).eq("type", args.type),
				)
				.first()
			if (existing) return null
		}
		return ctx.db.insert("notifications", {
			userId: args.userId,
			type: args.type,
			titre: args.titre,
			message: args.message,
			lien: args.lien,
			relatedId: args.relatedId,
			isRead: false,
			createdAt: Date.now(),
		})
	},
})

// ---------------------------------------------------------------------------
// Internal: vérifier les échéances (appelé par le cron quotidien)
// ---------------------------------------------------------------------------
export const checkEcheances = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const j1 = 24 * 60 * 60 * 1000
		const j7 = 7 * j1

		const taches = await ctx.db.query("taches").withIndex("by_echeance").collect()

		const actives = taches.filter((t) => t.status !== "termine" && t.dateEcheance && t.assigneId)

		for (const tache of actives) {
			const echeance = tache.dateEcheance!
			const userId = tache.assigneId!
			const id = tache._id

			const diff = echeance - now

			if (diff > 0 && diff <= j7 && diff > j1) {
				await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
					userId,
					type: "echeance_proche",
					titre: "Échéance dans 7 jours",
					message: `La tâche "${tache.nom}" est due dans 7 jours.`,
					lien: `/taches/${id}`,
					relatedId: `${id}_j7`,
				})
			} else if (diff > 0 && diff <= j1) {
				await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
					userId,
					type: "echeance_proche",
					titre: "Échéance demain",
					message: `La tâche "${tache.nom}" est due demain.`,
					lien: `/taches/${id}`,
					relatedId: `${id}_j1`,
				})
			} else if (diff < 0) {
				await ctx.scheduler.runAfter(0, internal.notifications.insertIfNotDuplicate, {
					userId,
					type: "echeance_depassee",
					titre: "Échéance dépassée",
					message: `La tâche "${tache.nom}" est en retard.`,
					lien: `/taches/${id}`,
					relatedId: `${id}_retard`,
				})
			}
		}
	},
})

export const create = internalMutation({
	args: {
		userId: v.string(),
		type: v.union(
			v.literal("echeance_proche"),
			v.literal("echeance_depassee"),
			v.literal("ticket_cree"),
			v.literal("tache_assignee"),
			v.literal("nouveau_message"),
			v.literal("mention"),
		),
		titre: v.string(),
		message: v.string(),
		lien: v.optional(v.string()),
		relatedId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return ctx.db.insert("notifications", {
			userId: args.userId,
			type: args.type,
			titre: args.titre,
			message: args.message,
			lien: args.lien,
			relatedId: args.relatedId,
			isRead: false,
			createdAt: Date.now(),
		})
	},
})
