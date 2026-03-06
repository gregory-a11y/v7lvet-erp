import { query } from "./_generated/server"
import { safeGetAuthUserWithRole } from "./auth"

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}
		const rules = await ctx.db.query("fiscalRules").withIndex("by_ordre").collect()
		return rules
	},
})
