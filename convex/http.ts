import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { httpAction } from "./_generated/server"
import { authComponent, createAuth } from "./auth"

const http = httpRouter()

// Workaround: Convex HTTP runtime may escape special characters (e.g. ! → \!)
// in POST request bodies, producing invalid JSON. We intercept POST requests
// and fix the body before passing it to Better Auth.
authComponent.registerRoutes(http, (ctx) => {
	const auth = createAuth(ctx)
	const originalHandler = auth.handler.bind(auth)
	auth.handler = async (request: Request) => {
		if (request.method === "POST") {
			const rawBody = await request.text()
			const fixedBody = rawBody.replace(/\\([!#$%&'()*+,/:;=?@[\]])/g, "$1")
			if (fixedBody !== rawBody) {
				const fixedRequest = new Request(request.url, {
					method: request.method,
					headers: request.headers,
					body: fixedBody,
				})
				return await originalHandler(fixedRequest)
			}
			// Body was fine, but already consumed — rebuild request
			const rebuiltRequest = new Request(request.url, {
				method: request.method,
				headers: request.headers,
				body: rawBody,
			})
			return await originalHandler(rebuiltRequest)
		}
		return await originalHandler(request)
	}
	return auth
})

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
			const oauthState = await ctx.runMutation(internal.calendarSync.verifyAndConsumeOAuthState, {
				nonce: stateParam,
			})
			if (!oauthState) {
				return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
			}
			userId = oauthState.userId
		} catch {
			return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
		}

		try {
			await ctx.runAction(internal.calendarSync.exchangeGoogleCode, {
				code,
				userId,
			})
		} catch (err) {
			console.error("Google OAuth exchange failed:", err instanceof Error ? err.message : "unknown")
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
			const oauthState = await ctx.runMutation(internal.calendarSync.verifyAndConsumeOAuthState, {
				nonce: stateParam,
			})
			if (!oauthState) {
				return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
			}
			userId = oauthState.userId
		} catch {
			return Response.redirect(`${siteUrl}/calendrier?error=invalid_state`, 302)
		}

		try {
			await ctx.runAction(internal.calendarSync.exchangeMicrosoftCode, {
				code,
				userId,
			})
		} catch (err) {
			console.error(
				"Microsoft OAuth exchange failed:",
				err instanceof Error ? err.message : "unknown",
			)
			return Response.redirect(`${siteUrl}/calendrier?error=exchange_failed`, 302)
		}

		return Response.redirect(`${siteUrl}/calendrier?connected=microsoft`, 302)
	}),
})

// ─── CORS helper ────────────────────────────────────────────────────────────

function getAllowedOrigin(origin: string | null): string | null {
	if (!origin) return null
	const trusted = (process.env.TRUSTED_ORIGINS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
	return trusted.includes(origin) ? origin : null
}

// ─── External API: Create Lead ──────────────────────────────────────────────

http.route({
	path: "/api/leads/create",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const origin = request.headers.get("Origin")
		const allowedOrigin = getAllowedOrigin(origin)
		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		}
		if (allowedOrigin) {
			corsHeaders["Access-Control-Allow-Origin"] = allowedOrigin
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

		// Rate limit: 1 lead per 2 seconds per API key
		try {
			await ctx.runMutation(internal.rateLimit.enforce, {
				action: "api.leads.create",
				key: keyHash,
				cooldownMs: 2000,
			})
		} catch {
			return new Response(JSON.stringify({ error: "Too many requests" }), {
				status: 429,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}

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
			// Resolve prestation strings to IDs (backward compat)
			let prestationIds: Id<"prestations">[] | undefined
			if (Array.isArray(body.prestations) && body.prestations.length > 0) {
				prestationIds = await ctx.runQuery(internal.prestations.lookupByTitles, {
					titles: body.prestations,
				})
			}

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
				prestationIds: prestationIds?.length ? prestationIds : undefined,
				montantEstime: body.montantEstime ? Number(body.montantEstime) : undefined,
			})

			return new Response(JSON.stringify({ success: true, id: leadId }), {
				status: 201,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		} catch (err: unknown) {
			console.error("Lead creation error:", err instanceof Error ? err.message : "unknown")
			return new Response(JSON.stringify({ error: "Internal error" }), {
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
	handler: httpAction(async (_ctx, request) => {
		const origin = request.headers.get("Origin")
		const allowedOrigin = getAllowedOrigin(origin)
		const headers: Record<string, string> = {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		}
		if (allowedOrigin) {
			headers["Access-Control-Allow-Origin"] = allowedOrigin
		}
		return new Response(null, { status: 204, headers })
	}),
})

export default http
