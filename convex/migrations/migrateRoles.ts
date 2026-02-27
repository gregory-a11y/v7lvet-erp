import { internalMutation } from "../_generated/server"

export const migrateRoles = internalMutation({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("userProfiles").collect()
		let migrated = 0

		for (const profile of profiles) {
			const role = profile.role as string
			if (role === "associe") {
				await ctx.db.patch(profile._id, { role: "admin" as any, updatedAt: Date.now() })
				migrated++
			} else if (role === "assistante") {
				await ctx.db.patch(profile._id, { role: "collaborateur" as any, updatedAt: Date.now() })
				migrated++
			}
		}

		return { migrated, total: profiles.length }
	},
})
