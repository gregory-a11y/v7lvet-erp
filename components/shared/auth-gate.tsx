"use client"

import { useConvexAuth } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth-client"

function DashboardSkeleton() {
	return (
		<div className="flex h-screen overflow-hidden">
			{/* Sidebar skeleton */}
			<div className="hidden md:flex w-[260px] flex-col bg-sidebar shrink-0">
				<div className="flex items-center justify-center px-5 py-5 h-16">
					<Skeleton className="h-6 w-24 bg-white/10" />
				</div>
				<div className="flex-1 px-4 py-4 space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-full bg-white/10 rounded-md" />
					))}
				</div>
			</div>
			{/* Main content skeleton */}
			<main className="flex-1 overflow-auto bg-background p-6 space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-4 w-48" />
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-[110px] w-full rounded-lg" />
					))}
				</div>
			</main>
		</div>
	)
}

export function AuthGate({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading: convexLoading } = useConvexAuth()
	const { data: session, isPending: sessionPending } = useSession()
	const router = useRouter()

	// Redirect ONLY when both Convex auth AND Better Auth session confirm no auth.
	// This prevents false redirects during the token propagation window
	// (after signIn.email() but before Convex receives the JWT).
	useEffect(() => {
		if (!convexLoading && !isAuthenticated && !sessionPending && !session) {
			router.replace("/login")
		}
	}, [convexLoading, isAuthenticated, sessionPending, session, router])

	// Convex auth fully ready → render children
	if (isAuthenticated) {
		return <>{children}</>
	}

	// Show skeleton in all other cases:
	// - Convex still loading
	// - Better Auth session pending
	// - Better Auth has session but Convex token hasn't propagated yet
	// - No session (skeleton shows briefly while redirect useEffect fires)
	return <DashboardSkeleton />
}
