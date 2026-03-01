import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { authComponent, createAuth } from "./auth"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// ─── Google Calendar OAuth Callback ──────────────────────────────────────────

http.route({
	path: "/calendar/callback/google",
	method: "GET",
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const code = url.searchParams.get("code")
		const stateParam = url.searchParams.get("state")
		const error = url.searchParams.get("error")

		const siteUrl = process.env.SITE_URL ?? "http://localhost:3000"

		if (error) {
			return Response.redirect(`${siteUrl}/calendrier?error=${encodeURIComponent(error)}`, 302)
		}

		if (!code || !stateParam) {
			return Response.redirect(`${siteUrl}/calendrier?error=missing_params`, 302)
		}

		let userId: string
		try {
			const padded = stateParam.replace(/-/g, "+").replace(/_/g, "/")
			const state = JSON.parse(atob(padded)) as {
				userId: string
			}
			userId = state.userId
		} catch {
			return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
		}

		try {
			await ctx.runAction(internal.calendarSync.exchangeGoogleCode, {
				code,
				userId,
			})
		} catch (err) {
			console.error("Google OAuth exchange failed:", err)
			return Response.redirect(`${siteUrl}/calendrier?error=exchange_failed`, 302)
		}

		return Response.redirect(`${siteUrl}/calendrier?connected=google`, 302)
	}),
})

// ─── Microsoft Calendar OAuth Callback ───────────────────────────────────────

http.route({
	path: "/calendar/callback/microsoft",
	method: "GET",
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const code = url.searchParams.get("code")
		const stateParam = url.searchParams.get("state")
		const error = url.searchParams.get("error")

		const siteUrl = process.env.SITE_URL ?? "http://localhost:3000"

		if (error) {
			return Response.redirect(`${siteUrl}/calendrier?error=${encodeURIComponent(error)}`, 302)
		}

		if (!code || !stateParam) {
			return Response.redirect(`${siteUrl}/calendrier?error=missing_params`, 302)
		}

		let userId: string
		try {
			const padded = stateParam.replace(/-/g, "+").replace(/_/g, "/")
			const state = JSON.parse(atob(padded)) as {
				userId: string
			}
			userId = state.userId
		} catch {
			return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
		}

		try {
			await ctx.runAction(internal.calendarSync.exchangeMicrosoftCode, {
				code,
				userId,
			})
		} catch (err) {
			console.error("Microsoft OAuth exchange failed:", err)
			return Response.redirect(`${siteUrl}/calendrier?error=exchange_failed`, 302)
		}

		return Response.redirect(`${siteUrl}/calendrier?connected=microsoft`, 302)
	}),
})

export default http
