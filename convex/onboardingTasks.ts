import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const listByLead = query({
	args: { leadId: v.id("leads") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const tasks = await ctx.db
			.query("onboardingTasks")
			.withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
			.collect()
		return tasks.sort((a, b) => a.ordre - b.ordre)
	},
})

export const update = mutation({
	args: {
		id: v.id("onboardingTasks"),
		statut: v.optional(v.union(v.literal("a_faire"), v.literal("en_cours"), v.literal("termine"))),
		assigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const { id, ...updates } = args
		const now = Date.now()

		const patch: Record<string, any> = { ...updates, updatedAt: now }
		if (args.statut === "termine") {
			patch.completedAt = now
			patch.completedById = user.id
		}

		await ctx.db.patch(id, patch)

		// Notify assignee if assigned to someone else
		if (args.assigneId && args.assigneId !== user.id) {
			const task = await ctx.db.get(id)
			if (task) {
				await ctx.db.insert("notifications", {
					userId: args.assigneId,
					type: "onboarding_assigne",
					titre: "Tâche d'onboarding assignée",
					message: `La tâche "${task.nom}" vous a été assignée`,
					lien: `/leads/${task.leadId}`,
					isRead: false,
					createdAt: now,
				})
			}
		}
	},
})

export const generateForLead = mutation({
	args: { leadId: v.id("leads") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") throw new Error("Non autorisé")

		// Check if tasks already exist
		const existing = await ctx.db
			.query("onboardingTasks")
			.withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
			.collect()
		if (existing.length > 0) return { generated: false, message: "Tasks already exist" }

		const templates = await ctx.db.query("onboardingTemplates").withIndex("by_ordre").collect()
		const active = templates.filter((t) => t.isActive)

		const now = Date.now()
		for (const template of active) {
			await ctx.db.insert("onboardingTasks", {
				leadId: args.leadId,
				templateId: template._id,
				nom: template.nom,
				description: template.description,
				ordre: template.ordre,
				statut: "a_faire",
				createdAt: now,
				updatedAt: now,
			})
		}

		return { generated: true, count: active.length }
	},
})
