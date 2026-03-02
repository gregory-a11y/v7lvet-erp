import { query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const listMembers = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
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
