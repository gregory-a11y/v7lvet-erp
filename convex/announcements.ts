import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

const announcementTypeValidator = v.union(
	v.literal("info"),
	v.literal("important"),
	v.literal("urgent"),
)

export const list = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)

		const now = Date.now()
		const announcements = await ctx.db
			.query("announcements")
			.withIndex("by_createdAt")
			.order("desc")
			.take(50)

		// Filter out expired announcements
		const active = announcements.filter((a) => !a.expiresAt || a.expiresAt > now)

		// Sort: pinned first, then by date desc
		active.sort((a, b) => {
			if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
			return b.createdAt - a.createdAt
		})

		// Enrich with author name
		const enriched = await Promise.all(
			active.map(async (a) => {
				const profile = await ctx.db
					.query("userProfiles")
					.withIndex("by_userId", (q) => q.eq("userId", a.createdById))
					.first()
				return {
					...a,
					authorName: profile?.nom ?? "Inconnu",
				}
			}),
		)

		return enriched
	},
})

export const create = mutation({
	args: {
		titre: v.string(),
		contenu: v.string(),
		type: announcementTypeValidator,
		isPinned: v.boolean(),
		expiresAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seuls les admins peuvent créer des annonces")

		const now = Date.now()
		return ctx.db.insert("announcements", {
			titre: args.titre,
			contenu: args.contenu,
			type: args.type,
			isPinned: args.isPinned,
			expiresAt: args.expiresAt,
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("announcements"),
		titre: v.string(),
		contenu: v.string(),
		type: announcementTypeValidator,
		isPinned: v.boolean(),
		expiresAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seuls les admins peuvent modifier des annonces")

		const { id, ...rest } = args
		await ctx.db.patch(id, {
			...rest,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("announcements") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seuls les admins peuvent supprimer des annonces")

		await ctx.db.delete(args.id)
	},
})

export const togglePin = mutation({
	args: { id: v.id("announcements") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seuls les admins peuvent épingler des annonces")

		const announcement = await ctx.db.get(args.id)
		if (!announcement) throw new Error("Annonce introuvable")

		await ctx.db.patch(args.id, {
			isPinned: !announcement.isPinned,
			updatedAt: Date.now(),
		})
	},
})
