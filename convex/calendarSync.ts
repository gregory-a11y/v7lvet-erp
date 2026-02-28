import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server"
import { authComponent } from "./auth"

// ─── Google OAuth URLs ───────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

function getGoogleRedirectUri(): string {
	const siteUrl = process.env.CONVEX_SITE_URL
	if (!siteUrl) throw new Error("CONVEX_SITE_URL non disponible")
	return `${siteUrl}/calendar/callback/google`
}

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

export const getGoogleOAuthUrl = action({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
		const userId = (user._id as string) || (user.id as string)

		const clientId = process.env.GOOGLE_CLIENT_ID
		if (!clientId) throw new Error("GOOGLE_CLIENT_ID non configuré")

		const siteUrl = process.env.CONVEX_SITE_URL
		if (!siteUrl) throw new Error("CONVEX_SITE_URL non disponible")

		const redirectUri = `${siteUrl}/calendar/callback/google`
		const state = btoa(JSON.stringify({ userId }))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "")

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: "code",
			scope:
				"https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
			access_type: "offline",
			prompt: "consent",
			state,
		})

		return `${GOOGLE_AUTH_URL}?${params.toString()}`
	},
})

export const exchangeGoogleCode = internalAction({
	args: {
		code: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const clientId = process.env.GOOGLE_CLIENT_ID!
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

		const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code: args.code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: getGoogleRedirectUri(),
				grant_type: "authorization_code",
			}),
		})

		if (!tokenRes.ok) {
			const err = await tokenRes.text()
			throw new Error(`Échec échange token Google: ${err}`)
		}

		const tokens = (await tokenRes.json()) as {
			access_token: string
			refresh_token?: string
			expires_in: number
		}

		if (!tokens.refresh_token) {
			throw new Error("Pas de refresh token — l'utilisateur doit révoquer l'accès et réessayer")
		}

		// Fetch user email
		let email: string | undefined
		try {
			const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
				headers: { Authorization: `Bearer ${tokens.access_token}` },
			})
			if (userInfoRes.ok) {
				const info = (await userInfoRes.json()) as { email?: string }
				email = info.email
			}
		} catch {
			// Non-bloquant
		}

		// Upsert connection
		await ctx.runMutation(internal.calendarSync.upsertConnection, {
			userId: args.userId,
			provider: "google",
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: Date.now() + tokens.expires_in * 1000,
			email,
		})

		// Trigger initial sync
		await ctx.runAction(internal.calendarSync.triggerGoogleSync, {
			userId: args.userId,
		})
	},
})

export const refreshGoogleToken = internalAction({
	args: { connectionId: v.id("calendarConnections") },
	handler: async (ctx, args) => {
		const connection = await ctx.runQuery(internal.calendarSync.getConnection, {
			id: args.connectionId,
		})
		if (!connection) throw new Error("Connexion introuvable")

		const clientId = process.env.GOOGLE_CLIENT_ID!
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

		const res = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: connection.refreshToken,
				grant_type: "refresh_token",
			}),
		})

		if (!res.ok) {
			const err = await res.text()
			// Si le refresh token est invalide, désactiver la connexion
			if (res.status === 400 || res.status === 401) {
				await ctx.runMutation(internal.calendarSync.deactivateConnection, {
					id: args.connectionId,
				})
			}
			throw new Error(`Échec refresh token Google: ${err}`)
		}

		const data = (await res.json()) as {
			access_token: string
			expires_in: number
		}

		await ctx.runMutation(internal.calendarSync.updateConnectionTokens, {
			id: args.connectionId,
			accessToken: data.access_token,
			expiresAt: Date.now() + data.expires_in * 1000,
		})

		return data.access_token
	},
})

// ─── Sync ────────────────────────────────────────────────────────────────────

export const triggerGoogleSync = internalAction({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const connection = await ctx.runQuery(internal.calendarSync.getActiveConnection, {
			userId: args.userId,
			provider: "google",
		})
		if (!connection) return

		// Refresh token si expiré (avec 5 min de marge)
		let accessToken = connection.accessToken
		if (connection.expiresAt < Date.now() + 5 * 60 * 1000) {
			accessToken = await ctx.runAction(internal.calendarSync.refreshGoogleToken, {
				connectionId: connection._id as Id<"calendarConnections">,
			})
		}

		// Sync window: -30 jours → +90 jours
		const now = new Date()
		const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

		let pageToken: string | undefined
		let totalSynced = 0

		do {
			const params = new URLSearchParams({
				timeMin,
				timeMax,
				singleEvents: "true",
				orderBy: "startTime",
				maxResults: "250",
			})
			if (pageToken) params.set("pageToken", pageToken)

			const res = await fetch(
				`${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
				{ headers: { Authorization: `Bearer ${accessToken}` } },
			)

			if (!res.ok) {
				const err = await res.text()
				throw new Error(`Erreur Google Calendar API: ${res.status} ${err}`)
			}

			const data = (await res.json()) as {
				items: GoogleCalendarEvent[]
				nextPageToken?: string
			}

			for (const item of data.items) {
				if (item.status === "cancelled") {
					// Supprimer l'event local s'il existe
					await ctx.runMutation(internal.calendarSync.deleteLocalEventByExternalId, {
						externalId: item.id,
						source: "google",
					})
					continue
				}

				const startAt = item.start?.dateTime
					? new Date(item.start.dateTime).getTime()
					: item.start?.date
						? new Date(item.start.date).getTime()
						: null

				const endAt = item.end?.dateTime
					? new Date(item.end.dateTime).getTime()
					: item.end?.date
						? new Date(item.end.date).getTime()
						: null

				if (!startAt || !endAt) continue

				const allDay = !item.start?.dateTime

				await ctx.runMutation(internal.calendarSync.upsertCalendarEvent, {
					externalId: item.id,
					source: "google",
					connectionId: connection._id as Id<"calendarConnections">,
					title: item.summary ?? "(Sans titre)",
					description: item.description,
					location: item.location,
					videoUrl: extractVideoUrl(item),
					startAt,
					endAt,
					allDay,
					createdById: args.userId,
				})
				totalSynced++
			}

			pageToken = data.nextPageToken
		} while (pageToken)

		// Mettre à jour lastSyncedAt
		await ctx.runMutation(internal.calendarSync.markSynced, {
			connectionId: connection._id as Id<"calendarConnections">,
		})

		return { synced: totalSynced }
	},
})

// ─── Push to Google ──────────────────────────────────────────────────────────

export const pushEventToGoogle = internalAction({
	args: {
		eventId: v.id("calendarEvents"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const connection = await ctx.runQuery(internal.calendarSync.getActiveConnection, {
			userId: args.userId,
			provider: "google",
		})
		if (!connection) return

		const event = await ctx.runQuery(internal.calendarSync.getCalendarEvent, {
			id: args.eventId,
		})
		if (!event) return

		// Refresh si nécessaire
		let accessToken = connection.accessToken
		if (connection.expiresAt < Date.now() + 5 * 60 * 1000) {
			accessToken = await ctx.runAction(internal.calendarSync.refreshGoogleToken, {
				connectionId: connection._id as Id<"calendarConnections">,
			})
		}

		const googleEvent: Record<string, unknown> = {
			summary: event.title,
			description: event.description,
			location: event.location,
		}

		if (event.allDay) {
			googleEvent.start = { date: formatDateOnly(event.startAt) }
			googleEvent.end = { date: formatDateOnly(event.endAt) }
		} else {
			googleEvent.start = { dateTime: new Date(event.startAt).toISOString() }
			googleEvent.end = { dateTime: new Date(event.endAt).toISOString() }
		}

		// Si l'event a déjà un externalId, on le met à jour, sinon on le crée
		let url = `${GOOGLE_CALENDAR_API}/calendars/primary/events`
		let method = "POST"
		const isNew = !event.externalId
		if (event.externalId) {
			url = `${url}/${event.externalId}`
			method = "PATCH"
		}

		// Auto-créer Google Meet pour les nouveaux events
		if (isNew) {
			googleEvent.conferenceData = {
				createRequest: {
					requestId: `v7lvet-${args.eventId}`,
					conferenceSolutionKey: { type: "hangoutsMeet" },
				},
			}
			url = `${url}?conferenceDataVersion=1`
		} else if (event.videoUrl) {
			googleEvent.conferenceData = {
				entryPoints: [{ entryPointType: "video", uri: event.videoUrl }],
			}
		}

		const res = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(googleEvent),
		})

		if (!res.ok) {
			const err = await res.text()
			console.error(`Échec push vers Google Calendar: ${res.status} ${err}`)
			return
		}

		const result = (await res.json()) as { id: string; hangoutLink?: string }

		// Stocker l'externalId sur l'event interne
		if (isNew) {
			await ctx.runMutation(internal.calendarSync.setEventExternalId, {
				eventId: args.eventId,
				externalId: result.id,
				source: "google",
				connectionId: connection._id as Id<"calendarConnections">,
			})
		}

		// Mettre à jour le videoUrl avec le lien Meet si disponible
		if (result.hangoutLink) {
			await ctx.runMutation(internal.calendarSync.updateEventVideoUrl, {
				eventId: args.eventId,
				videoUrl: result.hangoutLink,
			})
		}
	},
})

// ─── Internal Mutations / Queries (DB access) ───────────────────────────────

export const upsertConnection = internalMutation({
	args: {
		userId: v.string(),
		provider: v.union(v.literal("google"), v.literal("microsoft")),
		accessToken: v.string(),
		refreshToken: v.string(),
		expiresAt: v.number(),
		email: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("calendarConnections")
			.withIndex("by_user_provider", (q) =>
				q.eq("userId", args.userId).eq("provider", args.provider),
			)
			.first()

		const now = Date.now()
		if (existing) {
			await ctx.db.patch(existing._id, {
				accessToken: args.accessToken,
				refreshToken: args.refreshToken,
				expiresAt: args.expiresAt,
				email: args.email,
				isActive: true,
				updatedAt: now,
			})
			return existing._id
		}

		return ctx.db.insert("calendarConnections", {
			userId: args.userId,
			provider: args.provider,
			accessToken: args.accessToken,
			refreshToken: args.refreshToken,
			expiresAt: args.expiresAt,
			email: args.email,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const getConnection = internalQuery({
	args: { id: v.id("calendarConnections") },
	handler: async (ctx, args) => {
		return ctx.db.get(args.id)
	},
})

export const getActiveConnection = internalQuery({
	args: {
		userId: v.string(),
		provider: v.union(v.literal("google"), v.literal("microsoft")),
	},
	handler: async (ctx, args) => {
		const connection = await ctx.db
			.query("calendarConnections")
			.withIndex("by_user_provider", (q) =>
				q.eq("userId", args.userId).eq("provider", args.provider),
			)
			.first()
		if (!connection || !connection.isActive) return null
		return connection
	},
})

export const updateConnectionTokens = internalMutation({
	args: {
		id: v.id("calendarConnections"),
		accessToken: v.string(),
		expiresAt: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			accessToken: args.accessToken,
			expiresAt: args.expiresAt,
			updatedAt: Date.now(),
		})
	},
})

export const deactivateConnection = internalMutation({
	args: { id: v.id("calendarConnections") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() })
	},
})

export const upsertCalendarEvent = internalMutation({
	args: {
		externalId: v.string(),
		source: v.union(v.literal("google"), v.literal("microsoft")),
		connectionId: v.id("calendarConnections"),
		title: v.string(),
		description: v.optional(v.string()),
		location: v.optional(v.string()),
		videoUrl: v.optional(v.string()),
		startAt: v.number(),
		endAt: v.number(),
		allDay: v.boolean(),
		createdById: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("calendarEvents")
			.withIndex("by_externalId", (q) =>
				q.eq("externalId", args.externalId).eq("source", args.source),
			)
			.first()

		const now = Date.now()
		if (existing) {
			await ctx.db.patch(existing._id, {
				title: args.title,
				description: args.description,
				location: args.location,
				videoUrl: args.videoUrl,
				startAt: args.startAt,
				endAt: args.endAt,
				allDay: args.allDay,
				syncStatus: "synced",
				lastSyncedAt: now,
				updatedAt: now,
			})
			return existing._id
		}

		return ctx.db.insert("calendarEvents", {
			source: args.source,
			externalId: args.externalId,
			connectionId: args.connectionId,
			title: args.title,
			description: args.description,
			location: args.location,
			videoUrl: args.videoUrl,
			startAt: args.startAt,
			endAt: args.endAt,
			allDay: args.allDay,
			createdById: args.createdById,
			syncStatus: "synced",
			lastSyncedAt: now,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const markSynced = internalMutation({
	args: { connectionId: v.id("calendarConnections") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.connectionId, { updatedAt: Date.now() })
	},
})

export const getCalendarEvent = internalQuery({
	args: { id: v.id("calendarEvents") },
	handler: async (ctx, args) => {
		return ctx.db.get(args.id)
	},
})

export const setEventExternalId = internalMutation({
	args: {
		eventId: v.id("calendarEvents"),
		externalId: v.string(),
		source: v.union(v.literal("google"), v.literal("microsoft")),
		connectionId: v.id("calendarConnections"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.eventId, {
			externalId: args.externalId,
			source: args.source,
			connectionId: args.connectionId,
			syncStatus: "synced",
			lastSyncedAt: Date.now(),
			updatedAt: Date.now(),
		})
	},
})

// ─── Delete from Google ─────────────────────────────────────────────────────

export const deleteEventFromGoogle = internalAction({
	args: {
		externalId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const connection = await ctx.runQuery(internal.calendarSync.getActiveConnection, {
			userId: args.userId,
			provider: "google",
		})
		if (!connection) return

		let accessToken = connection.accessToken
		if (connection.expiresAt < Date.now() + 5 * 60 * 1000) {
			accessToken = await ctx.runAction(internal.calendarSync.refreshGoogleToken, {
				connectionId: connection._id as Id<"calendarConnections">,
			})
		}

		const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${args.externalId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		// 410 Gone = already deleted, OK
		if (!res.ok && res.status !== 410) {
			console.error(`Failed to delete Google event: ${res.status}`)
		}
	},
})

// ─── Video URL update ───────────────────────────────────────────────────────

export const updateEventVideoUrl = internalMutation({
	args: {
		eventId: v.id("calendarEvents"),
		videoUrl: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.eventId, {
			videoUrl: args.videoUrl,
			updatedAt: Date.now(),
		})
	},
})

// ─── Delete local event by externalId ───────────────────────────────────────

export const deleteLocalEventByExternalId = internalMutation({
	args: {
		externalId: v.string(),
		source: v.union(v.literal("google"), v.literal("microsoft")),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db
			.query("calendarEvents")
			.withIndex("by_externalId", (q) =>
				q.eq("externalId", args.externalId).eq("source", args.source),
			)
			.first()
		if (event) {
			await ctx.db.delete(event._id)
		}
	},
})

// ─── Public sync action (frontend-triggered) ────────────────────────────────

export const requestGoogleSync = action({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown>
		const userId = (user._id as string) || (user.id as string)

		const connection = await ctx.runQuery(internal.calendarSync.getActiveConnection, {
			userId,
			provider: "google",
		})
		if (!connection) return { synced: false }

		await ctx.runAction(internal.calendarSync.triggerGoogleSync, {
			userId,
		})

		return { synced: true }
	},
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface GoogleCalendarEvent {
	id: string
	status?: string
	summary?: string
	description?: string
	location?: string
	start?: { dateTime?: string; date?: string }
	end?: { dateTime?: string; date?: string }
	hangoutLink?: string
	conferenceData?: {
		entryPoints?: { entryPointType?: string; uri?: string }[]
	}
}

function extractVideoUrl(item: GoogleCalendarEvent): string | undefined {
	if (item.hangoutLink) return item.hangoutLink
	const videoEntry = item.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")
	return videoEntry?.uri
}

function formatDateOnly(timestamp: number): string {
	const d = new Date(timestamp)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
