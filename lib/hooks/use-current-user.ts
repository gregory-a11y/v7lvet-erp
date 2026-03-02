"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getUserSections, type SectionKey } from "@/lib/permissions"

/**
 * Hook to get the current authenticated user with role from userProfiles.
 * Uses the Convex getCurrentUser query which enriches Better Auth user with role.
 */
export function useCurrentUser() {
	const user = useQuery(api.auth.getCurrentUser)
	const role = (user?.role as string) ?? null
	const sections = getUserSections(role, user?.sections as string[] | null) as SectionKey[]

	return {
		user,
		isLoading: user === undefined,
		isAuthenticated: user !== null && user !== undefined,
		role,
		isAdmin: role === "admin",
		isManager: role === "manager",
		isManagerOrAbove: role === "admin" || role === "manager",
		mustChangePassword: user?.mustChangePassword ?? false,
		sections,
		fonctionNom: (user as any)?.fonctionNom ?? null,
	}
}
