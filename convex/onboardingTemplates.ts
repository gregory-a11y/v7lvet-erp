import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.query("onboardingTemplates").withIndex("by_ordre").collect()
	},
})

export const create = mutation({
	args: {
		nom: v.string(),
		description: v.optional(v.string()),
		ordre: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		const now = Date.now()
		return ctx.db.insert("onboardingTemplates", {
			nom: args.nom,
			description: args.description,
			ordre: args.ordre,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("onboardingTemplates"),
		nom: v.optional(v.string()),
		description: v.optional(v.string()),
		ordre: v.optional(v.number()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const remove = mutation({
	args: { id: v.id("onboardingTemplates") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")
		await ctx.db.delete(args.id)
	},
})

export const seedDefaults = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Accès réservé aux admins")

		const existing = await ctx.db.query("onboardingTemplates").collect()
		if (existing.length > 0) return { seeded: false, message: "Templates already exist" }

		const now = Date.now()
		const defaults = [
			{
				nom: "Création dossier Pennylane",
				description: "Créer le dossier client dans Pennylane et configurer les accès",
				ordre: 1,
			},
			{
				nom: "Formulaire LAB",
				description: "Lutte anti-blanchiment — formulaire de vigilance client",
				ordre: 2,
			},
			{
				nom: "Formulaire acceptation/maintien de mission",
				description: "Formulaire d'acceptation ou de maintien de la mission comptable",
				ordre: 3,
			},
			{
				nom: "Lettre de reprise (si applicable)",
				description: "Rédiger et envoyer la lettre de reprise à l'ancien cabinet",
				ordre: 4,
			},
			{
				nom: "Lettre de mission + signature",
				description: "Rédiger la lettre de mission et obtenir la signature du client",
				ordre: 5,
			},
			{
				nom: "Accès client + mail de bienvenue",
				description: "Configurer les accès client et envoyer le mail de bienvenue",
				ordre: 6,
			},
			{ nom: "Inscription ANANI", description: "Inscrire le client auprès de l'ANANI", ordre: 7 },
		]

		for (const d of defaults) {
			await ctx.db.insert("onboardingTemplates", {
				...d,
				isActive: true,
				createdAt: now,
				updatedAt: now,
			})
		}

		return { seeded: true, count: defaults.length }
	},
})
