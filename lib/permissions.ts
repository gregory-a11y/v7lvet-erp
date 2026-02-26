export type UserRole = "admin" | "manager" | "collaborateur"

export type SectionKey = "operationnel" | "acquisition" | "administration"

const roleHierarchy: Record<UserRole, number> = {
	admin: 3,
	manager: 2,
	collaborateur: 1,
}

export const SECTION_DEFAULTS: Record<UserRole, SectionKey[]> = {
	admin: ["operationnel", "acquisition", "administration"],
	manager: ["operationnel", "acquisition"],
	collaborateur: ["operationnel"],
}

export const SECTION_LABELS: Record<SectionKey, string> = {
	operationnel: "Opérationnel",
	acquisition: "Acquisition",
	administration: "Administration",
}

export const ROUTE_TO_SECTION: Record<string, SectionKey> = {
	"/dashboard": "operationnel",
	"/clients": "operationnel",
	"/runs": "operationnel",
	"/taches": "operationnel",
	"/tickets": "operationnel",
	"/documents": "operationnel",
	"/sops": "operationnel",
	"/acquisition": "acquisition",
	"/opportunites": "acquisition",
	"/equipe": "administration",
	"/settings": "administration",
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
	return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function isAdmin(role: string | null | undefined): boolean {
	return role === "admin"
}

export function isManagerOrAbove(role: string | null | undefined): boolean {
	if (!role) return false
	return hasMinRole(role as UserRole, "manager")
}

export function getUserSections(
	role: string | null,
	customSections?: string[] | null,
): SectionKey[] {
	if (customSections && customSections.length > 0) {
		return customSections as SectionKey[]
	}
	return SECTION_DEFAULTS[(role as UserRole) ?? "collaborateur"] ?? SECTION_DEFAULTS.collaborateur
}

export function hasAccessToRoute(pathname: string, sections: SectionKey[]): boolean {
	const matchedRoute = Object.keys(ROUTE_TO_SECTION).find(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	)
	if (!matchedRoute) return true
	return sections.includes(ROUTE_TO_SECTION[matchedRoute])
}
