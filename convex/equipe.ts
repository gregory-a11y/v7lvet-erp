import { query } from "./_generated/server"
import { authComponent } from "./auth"

// TODO: Implémenter la liste des membres via Better Auth user table
// Pour l'instant, on ne peut pas lister tous les users directement depuis Convex
// car les tables auth sont gérées par le component Better Auth.
export const listMembers = query({
	args: {},
	handler: async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as Record<string, unknown> | null
		if (!user) return []

		// TODO: Requêter la table users du component Better Auth
		// pour retourner tous les membres de l'équipe
		return []
	},
})

export const me = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx)
	},
})
