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

// ─── External API: Create Lead ──────────────────────────────────────────────

http.route({
	path: "/api/leads/create",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		}

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders })
		}

		// Validate API key
		const authHeader = request.headers.get("Authorization")
		if (!authHeader?.startsWith("Bearer ")) {
			return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
				status: 401,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}

		const rawKey = authHeader.slice(7)

		// Hash and validate key
		const encoder = new TextEncoder()
		const data = encoder.encode(rawKey)
		const hashBuffer = await crypto.subtle.digest("SHA-256", data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

		const apiKey = await ctx.runQuery(internal.apiKeysInternal.findByHash, { keyHash })
		if (!apiKey) {
			return new Response(JSON.stringify({ error: "Invalid API key" }), {
				status: 401,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}

		// Update lastUsedAt
		await ctx.runMutation(internal.apiKeysInternal.markUsed, { id: apiKey._id })

		// Parse body
		let body: any
		try {
			body = await request.json()
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}

		// Validate required fields
		if (!body.contactNom || typeof body.contactNom !== "string") {
			return new Response(JSON.stringify({ error: "contactNom is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}
		if (!body.contactEmail && !body.contactTelephone) {
			return new Response(
				JSON.stringify({ error: "contactEmail or contactTelephone is required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				},
			)
		}

		try {
			const leadId = await ctx.runMutation(internal.leads.createFromApi, {
				contactNom: body.contactNom,
				contactPrenom: body.contactPrenom,
				contactEmail: body.contactEmail,
				contactTelephone: body.contactTelephone,
				entrepriseRaisonSociale: body.entrepriseRaisonSociale,
				entrepriseSiren: body.entrepriseSiren,
				source: body.source,
				sourceDetail: body.sourceDetail,
				notes: body.notes,
				type: body.type,
				prestations: body.prestations,
				montantEstime: body.montantEstime ? Number(body.montantEstime) : undefined,
			})

			return new Response(JSON.stringify({ success: true, id: leadId }), {
				status: 201,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		} catch (err: any) {
			return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
				status: 500,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}
	}),
})

// Handle CORS preflight for leads API
http.route({
	path: "/api/leads/create",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		})
	}),
})

export default http
