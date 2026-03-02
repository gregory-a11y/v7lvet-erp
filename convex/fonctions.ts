import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		const fonctions = await ctx.db.query("fonctions").collect()
		return fonctions.sort((a, b) => a.nom.localeCompare(b.nom))
	},
})

export const create = mutation({
	args: { nom: v.string() },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut gérer les fonctions")

		const nom = args.nom.trim()
		if (!nom) throw new Error("Le nom ne peut pas être vide")

		const existing = await ctx.db
			.query("fonctions")
			.withIndex("by_nom", (q) => q.eq("nom", nom))
			.first()
		if (existing) throw new Error("Cette fonction existe déjà")

		return ctx.db.insert("fonctions", { nom, createdAt: Date.now() })
	},
})

export const remove = mutation({
	args: { fonctionId: v.id("fonctions") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut gérer les fonctions")

		const fonction = await ctx.db.get(args.fonctionId)
		if (!fonction) throw new Error("Fonction non trouvée")

		// Remove fonctionId from all userProfiles that reference it
		const profiles = await ctx.db.query("userProfiles").collect()
		for (const profile of profiles) {
			if (profile.fonctionId === args.fonctionId) {
				await ctx.db.patch(profile._id, { fonctionId: undefined })
			}
		}

		await ctx.db.delete(args.fonctionId)
	},
})
