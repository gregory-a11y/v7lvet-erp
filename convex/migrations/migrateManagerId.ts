import { internalMutation } from "../_generated/server"

/**
 * Migration: managerId → responsableOperationnelId sur la table clients.
 * Exécuter une seule fois via le dashboard Convex.
 */
export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		const clients = await ctx.db.query("clients").collect()
		let migrated = 0

		for (const client of clients) {
			const doc = client as any
			if (doc.managerId && !doc.responsableOperationnelId) {
				await ctx.db.patch(client._id, {
					responsableOperationnelId: doc.managerId,
				} as any)
				migrated++
			}
		}

		return { migrated, total: clients.length }
	},
})
