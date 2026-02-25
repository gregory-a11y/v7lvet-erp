export type UserRole = "associe" | "manager" | "collaborateur" | "assistante"

const roleHierarchy: Record<UserRole, number> = {
	associe: 4,
	manager: 3,
	collaborateur: 2,
	assistante: 1,
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
	return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function isAssociate(role: string | undefined): boolean {
	return role === "associe"
}

export function isManagerOrAbove(role: string | undefined): boolean {
	if (!role) return false
	return hasMinRole(role as UserRole, "manager")
}
