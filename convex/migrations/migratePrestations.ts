import { internalMutation } from "../_generated/server"

/**
 * Migration: converts old `prestations: string[]` field on leads
 * to the new `prestationIds: Id<"prestations">[]` field, then removes
 * the deprecated `prestations` field.
 *
 * Run via Convex dashboard: migrations:migratePrestations
 */
export const migratePrestations = internalMutation({
	args: {},
	handler: async (ctx) => {
		const leads = await ctx.db.query("leads").collect()
		let migrated = 0
		let skipped = 0

		// Build a lookup: lowercase title → prestation ID
		const allPrestations = await ctx.db.query("prestations").collect()
		const titleToId = new Map<string, string>()
		for (const p of allPrestations) {
			titleToId.set(p.titre.toLowerCase(), p._id)
		}

		// Also build a lookup from old leadOption values
		const leadOptions = await ctx.db
			.query("leadOptions")
			.filter((q) => q.eq(q.field("category"), "prestation"))
			.collect()
		const valueToLabel = new Map<string, string>()
		for (const opt of leadOptions) {
			valueToLabel.set(opt.value, opt.label)
		}

		for (const lead of leads) {
			const oldPrestations = (lead as any).prestations as string[] | undefined
			if (!oldPrestations || oldPrestations.length === 0) {
				// Remove the field if it exists but is empty
				if (oldPrestations !== undefined) {
					await ctx.db.patch(lead._id, { prestations: undefined } as any)
				}
				skipped++
				continue
			}

			// Try to resolve old string values to new prestation IDs
			const resolvedIds: string[] = []
			for (const val of oldPrestations) {
				// First try direct title match
				const byTitle = titleToId.get(val.toLowerCase())
				if (byTitle) {
					resolvedIds.push(byTitle)
					continue
				}
				// Then try via leadOption label
				const label = valueToLabel.get(val)
				if (label) {
					const byLabel = titleToId.get(label.toLowerCase())
					if (byLabel) {
						resolvedIds.push(byLabel)
					}
				}
			}

			await ctx.db.patch(lead._id, {
				prestationIds: resolvedIds.length > 0 ? (resolvedIds as any) : undefined,
				prestations: undefined,
			} as any)
			migrated++
		}

		return { migrated, skipped, total: leads.length }
	},
})
