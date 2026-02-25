import { v } from "convex/values"
import { action, query } from "./_generated/server"
import { authComponent } from "./auth"

export const me = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx)
	},
})

export const createByAdmin = action({
	args: {
		email: v.string(),
		password: v.string(),
		name: v.string(),
		role: v.union(
			v.literal("associe"),
			v.literal("manager"),
			v.literal("collaborateur"),
			v.literal("assistante"),
		),
	},
	handler: async (ctx, args) => {
		const currentUser = await authComponent.getAuthUser(ctx) as Record<string, unknown> | null
		if (!currentUser) {
			throw new Error("Non authentifié")
		}
		if (currentUser.role !== "associe") {
			throw new Error("Seul un associé peut créer des utilisateurs")
		}

		const siteUrl = process.env.SITE_URL!
		const response = await fetch(`${siteUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: args.email,
				password: args.password,
				name: args.name,
				role: args.role,
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Erreur lors de la création du compte: ${text}`)
		}

		return { success: true }
	},
})
