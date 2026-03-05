import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const publicPaths = [
	"/login",
	"/forgot-password",
	"/reset-password",
	"/api/auth",
	"/privacy",
	"/terms",
]

function isPublicPath(pathname: string): boolean {
	return publicPaths.some((path) => pathname.startsWith(path))
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Generate CSP nonce for every request
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
	const isDev = process.env.NODE_ENV === "development"

	const cspHeader = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
		`style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site",
		"frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.loom.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	]
		.join("; ")
		.replace(/\s{2,}/g, " ")
		.trim()

	const requestHeaders = new Headers(request.headers)
	requestHeaders.set("x-nonce", nonce)
	requestHeaders.set("Content-Security-Policy", cspHeader)

	if (isPublicPath(pathname)) {
		const response = NextResponse.next({ request: { headers: requestHeaders } })
		response.headers.set("Content-Security-Policy", cspHeader)
		return response
	}

	const sessionCookie =
		request.cookies.get("better-auth.session_token") ??
		request.cookies.get("__Secure-better-auth.session_token")

	if (!sessionCookie) {
		const loginUrl = new URL("/login", request.url)
		const response = NextResponse.redirect(loginUrl)
		response.headers.set("Content-Security-Policy", cspHeader)
		return response
	}

	const response = NextResponse.next({ request: { headers: requestHeaders } })
	response.headers.set("Content-Security-Policy", cspHeader)
	return response
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logos/).*)"],
}
