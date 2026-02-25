import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const publicPaths = ["/login", "/api/auth"]

function isPublicPath(pathname: string): boolean {
	return publicPaths.some((path) => pathname.startsWith(path))
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (isPublicPath(pathname)) {
		return NextResponse.next()
	}

	const sessionCookie =
		request.cookies.get("better-auth.session_token") ??
		request.cookies.get("__Secure-better-auth.session_token")

	if (!sessionCookie) {
		const loginUrl = new URL("/login", request.url)
		return NextResponse.redirect(loginUrl)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|logos/).*)"],
}
