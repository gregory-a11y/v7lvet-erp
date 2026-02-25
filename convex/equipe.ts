import { query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

export const listMembers = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.query("userProfiles").collect()
	},
})

export const me = query({
	args: {},
	handler: async (ctx) => {
		return getAuthUserWithRole(ctx)
	},
})
