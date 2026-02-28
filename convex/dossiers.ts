import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const dossiers = await ctx.db
			.query("dossiers")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()

		// Permission cascade
		if (user.role === "collaborateur") {
			return dossiers.filter((d) => d.collaborateurId === (user.id as string))
		}
		if (user.role === "manager") {
			return dossiers.filter((d) => d.managerId === (user.id as string))
		}
		return dossiers
	},
})

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		nom: v.string(),
		type: v.string(),
		exercice: v.optional(v.string()),
		managerId: v.optional(v.string()),
		collaborateurId: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client non trouvé")

		// Associé ou manager du client
		if (user.role !== "admin" && client.managerId !== (user.id as string)) {
			throw new Error("Non autorisé")
		}

		const now = Date.now()
		return ctx.db.insert("dossiers", {
			clientId: args.clientId,
			nom: args.nom,
			type: args.type as any,
			exercice: args.exercice,
			managerId: args.managerId,
			collaborateurId: args.collaborateurId,
			notes: args.notes,
			status: "actif",
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const archive = mutation({
	args: { id: v.id("dossiers") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut archiver un dossier")

		await ctx.db.patch(args.id, {
			status: "archive" as any,
			updatedAt: Date.now(),
		})
	},
})
