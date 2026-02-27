"use client"

import { useQuery } from "convex/react"
import { createContext, useContext } from "react"
import { api } from "@/convex/_generated/api"
import { getUserSections, type SectionKey } from "@/lib/permissions"

interface CurrentUserContextValue {
	user: ReturnType<typeof useQuery<typeof api.auth.getCurrentUser>>
	isLoading: boolean
	isAuthenticated: boolean
	role: string | null
	isAdmin: boolean
	isManager: boolean
	isManagerOrAbove: boolean
	mustChangePassword: boolean
	sections: SectionKey[]
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
	const user = useQuery(api.auth.getCurrentUser)
	const role = (user?.role as string) ?? null
	const sections = getUserSections(role, user?.sections as string[] | null) as SectionKey[]

	const value: CurrentUserContextValue = {
		user,
		isLoading: user === undefined,
		isAuthenticated: user !== null && user !== undefined,
		role,
		isAdmin: role === "admin",
		isManager: role === "manager",
		isManagerOrAbove: role === "admin" || role === "manager",
		mustChangePassword: user?.mustChangePassword ?? false,
		sections,
	}

	return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUserContext() {
	const ctx = useContext(CurrentUserContext)
	if (!ctx) {
		throw new Error("useCurrentUserContext must be used within a CurrentUserProvider")
	}
	return ctx
}
