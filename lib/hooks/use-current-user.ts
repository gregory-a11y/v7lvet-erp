"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * Hook to get the current authenticated user with role from userProfiles.
 * Uses the Convex getCurrentUser query which enriches Better Auth user with role.
 */
export function useCurrentUser() {
	const user = useQuery(api.auth.getCurrentUser)
	return {
		user,
		isLoading: user === undefined,
		isAuthenticated: user !== null && user !== undefined,
		role: (user?.role as string) ?? null,
		isAssociate: (user?.role as string) === "associe",
		isManager: (user?.role as string) === "manager",
	}
}
