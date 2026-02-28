import { query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}
		const rules = await ctx.db.query("fiscalRules").withIndex("by_ordre").collect()
		return rules
	},
})
