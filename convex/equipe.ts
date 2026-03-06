import { query } from "./_generated/server"
import { safeGetAuthUserWithRole } from "./auth"

export const listMembers = query({
	args: {},
	handler: async (ctx) => {
		if (!(await safeGetAuthUserWithRole(ctx))) return []
		const profiles = await ctx.db.query("userProfiles").collect()
		return Promise.all(
			profiles.map(async (p) => {
				let fonctionNom: string | null = null
				if (p.fonctionId) {
					const f = await ctx.db.get(p.fonctionId)
					fonctionNom = f?.nom ?? null
				}
				return { ...p, fonctionNom }
			}),
		)
	},
})
