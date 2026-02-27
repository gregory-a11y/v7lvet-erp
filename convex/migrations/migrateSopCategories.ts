import { mutation } from "../_generated/server"
import { getAuthUserWithRole } from "../auth"

const DEFAULT_CATEGORIES = [
	{ nom: "Fiscalité", slug: "fiscalite", color: "#2E6965" },
	{ nom: "Comptabilité", slug: "comptabilite", color: "#063238" },
	{ nom: "Social / Paie", slug: "social-paie", color: "#6242FB" },
	{ nom: "Juridique", slug: "juridique", color: "#D97706" },
	{ nom: "Gestion interne", slug: "gestion-interne", color: "#6B7280" },
	{ nom: "Commercial", slug: "commercial", color: "#059669" },
	{ nom: "Informatique", slug: "informatique", color: "#7C3AED" },
] as const

// Mapping from old free-text categories to slugs
const CATEGORY_MAPPING: Record<string, string> = {
	fiscal: "fiscalite",
	fiscalité: "fiscalite",
	fiscalite: "fiscalite",
	compta: "comptabilite",
	comptabilité: "comptabilite",
	comptabilite: "comptabilite",
	paie: "social-paie",
	social: "social-paie",
	"social / paie": "social-paie",
	juridique: "juridique",
	gestion: "gestion-interne",
	"gestion interne": "gestion-interne",
	commercial: "commercial",
	informatique: "informatique",
}

export const migrateSopCategories = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		// 1. Seed default categories
		let categoriesCreated = 0
		for (const cat of DEFAULT_CATEGORIES) {
			const existing = await ctx.db
				.query("sopCategories")
				.withIndex("by_slug", (q) => q.eq("slug", cat.slug))
				.first()
			if (!existing) {
				await ctx.db.insert("sopCategories", {
					nom: cat.nom,
					slug: cat.slug,
					color: cat.color,
					isDefault: true,
					isActive: true,
					createdAt: Date.now(),
				})
				categoriesCreated++
			}
		}

		// 2. Migrate SOPs with old string categorie to categorieId
		const sops = await ctx.db.query("sops").collect()
		let sopsMigrated = 0
		for (const sop of sops) {
			if (sop.categorie && !sop.categorieId) {
				const slug = CATEGORY_MAPPING[sop.categorie.toLowerCase().trim()]
				if (slug) {
					const cat = await ctx.db
						.query("sopCategories")
						.withIndex("by_slug", (q) => q.eq("slug", slug))
						.first()
					if (cat) {
						await ctx.db.patch(sop._id, { categorieId: cat._id })
						sopsMigrated++
					}
				}
			}
		}

		return { categoriesCreated, sopsMigrated, totalSops: sops.length }
	},
})
