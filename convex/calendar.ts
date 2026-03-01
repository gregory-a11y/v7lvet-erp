import { v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { authComponent, getAuthUserWithRole } from "./auth"

const participantValidator = v.object({
	type: v.union(v.literal("team"), v.literal("client"), v.literal("external")),
	userId: v.optional(v.string()),
	clientId: v.optional(v.id("clients")),
	contactId: v.optional(v.id("contacts")),
	email: v.optional(v.string()),
	name: v.optional(v.string()),
	status: v.union(
		v.literal("pending"),
		v.literal("accepted"),
		v.literal("declined"),
		v.literal("tentative"),
	),
})

export const listConnections = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		const userId = (user._id as string) || (user.id as string)
		const connections = await ctx.db
			.query("calendarConnections")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect()
		// Never expose tokens to client
		return connections.map(({ accessToken: _a, refreshToken: _r, ...safe }) => safe)
	},
})

export const listTeamEvents = query({
	args: {
		start: v.number(),
		end: v.number(),
	},
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []
		const userId = (user._id as string) || (user.id as string)

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()
		const role = profile?.role ?? "collaborateur"

		// Fetch events that START before the end of range, then filter those that END after the start of range.
		// This correctly captures events spanning across the range boundaries.
		const events = await ctx.db
			.query("calendarEvents")
			.withIndex("by_date_range", (q) => q.lt("startAt", args.end))
			.filter((q) => q.gt(q.field("endAt"), args.start))
			.collect()

		if (role === "admin" || role === "manager") {
			return events
		}

		return events.filter((event) => {
			if (event.createdById === userId) return true
			if (event.participants?.some((p) => p.userId === userId)) return true
			return false
		})
	},
})

export const getEventById = query({
	args: { id: v.id("calendarEvents") },
	handler: async (ctx, args) => {
		const user = (await authComponent.safeGetAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return null
		const userId = (user._id as string) || (user.id as string)

		const event = await ctx.db.get(args.id)
		if (!event) return null

		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first()
		const role = profile?.role ?? "collaborateur"

		if (role === "admin" || role === "manager") return event
		if (event.createdById === userId) return event
		if (event.participants?.some((p) => p.userId === userId)) return event

		return null
	},
})

export const createEvent = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		location: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		startAt: v.number(),
		endAt: v.number(),
		allDay: v.boolean(),
		participants: v.optional(v.array(participantValidator)),
		color: v.optional(v.string()),
		createMeetLink: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()
		const eventId = await ctx.db.insert("calendarEvents", {
			source: "internal",
			title: args.title,
			description: args.description,
			location: args.location,
			videoUrl: args.videoUrl,
			startAt: args.startAt,
			endAt: args.endAt,
			allDay: args.allDay,
			participants: args.participants,
			color: args.color,
			createdById: user.id,
			createdAt: now,
			updatedAt: now,
		})

		// Push vers Google Calendar si connecté
		const googleConn = await ctx.db
			.query("calendarConnections")
			.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "google"))
			.first()
		if (googleConn?.isActive) {
			await ctx.scheduler.runAfter(0, internal.calendarSync.pushEventToGoogle, {
				eventId,
				userId: user.id,
				createMeetLink: args.createMeetLink ?? false,
			})
		} else {
			// Push vers Microsoft Calendar si connecté (et pas de Google)
			const msConn = await ctx.db
				.query("calendarConnections")
				.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "microsoft"))
				.first()
			if (msConn?.isActive) {
				await ctx.scheduler.runAfter(0, internal.calendarSync.pushEventToMicrosoft, {
					eventId,
					userId: user.id,
				})
			}
		}

		return eventId
	},
})

export const updateEvent = mutation({
	args: {
		id: v.id("calendarEvents"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		location: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		startAt: v.optional(v.number()),
		endAt: v.optional(v.number()),
		allDay: v.optional(v.boolean()),
		participants: v.optional(v.array(participantValidator)),
		color: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const event = await ctx.db.get(args.id)
		if (!event) throw new Error("Événement introuvable")

		if (event.createdById !== user.id && user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}

		const { id, ...updates } = args
		const filtered: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) filtered[key] = value
		}
		filtered.updatedAt = Date.now()

		await ctx.db.patch(args.id, filtered)

		// Push update vers le provider externe si event synchronisé
		if (event.externalId && event.source === "google") {
			const googleConn = await ctx.db
				.query("calendarConnections")
				.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "google"))
				.first()
			if (googleConn?.isActive) {
				await ctx.scheduler.runAfter(0, internal.calendarSync.pushEventToGoogle, {
					eventId: args.id,
					userId: user.id,
				})
			}
		} else if (event.externalId && event.source === "microsoft") {
			const msConn = await ctx.db
				.query("calendarConnections")
				.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "microsoft"))
				.first()
			if (msConn?.isActive) {
				await ctx.scheduler.runAfter(0, internal.calendarSync.pushEventToMicrosoft, {
					eventId: args.id,
					userId: user.id,
				})
			}
		}
	},
})

export const deleteEvent = mutation({
	args: { id: v.id("calendarEvents") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const event = await ctx.db.get(args.id)
		if (!event) throw new Error("Événement introuvable")

		if (event.createdById !== user.id && user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}

		const externalId = event.externalId

		await ctx.db.delete(args.id)

		// Supprimer sur le provider externe si synchronisé
		if (externalId && event.source === "google") {
			const googleConn = await ctx.db
				.query("calendarConnections")
				.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "google"))
				.first()
			if (googleConn?.isActive) {
				await ctx.scheduler.runAfter(0, internal.calendarSync.deleteEventFromGoogle, {
					externalId,
					userId: user.id,
				})
			}
		} else if (externalId && event.source === "microsoft") {
			const msConn = await ctx.db
				.query("calendarConnections")
				.withIndex("by_user_provider", (q) => q.eq("userId", user.id).eq("provider", "microsoft"))
				.first()
			if (msConn?.isActive) {
				await ctx.scheduler.runAfter(0, internal.calendarSync.deleteEventFromMicrosoft, {
					externalId,
					userId: user.id,
				})
			}
		}
	},
})

export const disconnectCalendar = mutation({
	args: { id: v.id("calendarConnections") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const connection = await ctx.db.get(args.id)
		if (!connection) throw new Error("Connexion introuvable")

		if (connection.userId !== user.id && user.role !== "admin") {
			throw new Error("Non autorisé")
		}

		await ctx.db.delete(args.id)
	},
})
