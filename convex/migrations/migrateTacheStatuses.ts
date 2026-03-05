import { mutation } from "../_generated/server"

/**
 * Migration: rename tache statuses
 * - "a_venir" → "a_faire"
 * - "en_cours" → "a_faire"
 *
 * Run once via dashboard: api.migrations.migrateTacheStatuses.default
 */
export default mutation({
	args: {},
	handler: async (ctx) => {
		const taches = await ctx.db.query("taches").collect()
		let updated = 0

		for (const t of taches) {
			if ((t.status as string) === "a_venir" || (t.status as string) === "en_cours") {
				await ctx.db.patch(t._id, {
					status: "a_faire",
					updatedAt: Date.now(),
				})
				updated++
			}
		}

		return { updated, total: taches.length }
	},
})
