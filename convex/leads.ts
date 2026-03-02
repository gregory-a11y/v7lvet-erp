import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

// ─── Validators ─────────────────────────────────────────────────────────────

const STATUT = v.union(
	v.literal("prise_de_contact"),
	v.literal("rendez_vous"),
	v.literal("qualification"),
	v.literal("go_no_go"),
	v.literal("valide"),
	v.literal("onboarding"),
	v.literal("perdu"),
	v.literal("a_relancer"),
)

const TYPE = v.string()

const SOURCE = v.string()

const RDV_TYPE = v.union(v.literal("visio"), v.literal("physique"), v.literal("telephone"))

// ─── Queries ────────────────────────────────────────────────────────────────

export const list = query({
	args: {
		statut: v.optional(v.string()),
		responsableId: v.optional(v.string()),
		source: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)

		if (args.statut) {
			return ctx.db
				.query("leads")
				.withIndex("by_statut", (q) => q.eq("statut", args.statut as any))
				.collect()
		}
		if (args.responsableId) {
			return ctx.db
				.query("leads")
				.withIndex("by_responsable", (q) => q.eq("responsableId", args.responsableId))
				.collect()
		}
		return ctx.db.query("leads").collect()
	},
})

export const listForKanban = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		const leads = await ctx.db.query("leads").collect()
		// Group by statut, sorted by order within each group
		const grouped: Record<string, typeof leads> = {}
		for (const lead of leads) {
			if (!grouped[lead.statut]) grouped[lead.statut] = []
			grouped[lead.statut].push(lead)
		}
		for (const statut of Object.keys(grouped)) {
			grouped[statut].sort((a, b) => a.order - b.order)
		}
		return grouped
	},
})

export const getById = query({
	args: { id: v.id("leads") },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		return ctx.db.get(args.id)
	},
})

export const search = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		if (!args.query.trim()) return []
		return ctx.db
			.query("leads")
			.withSearchIndex("search_contact", (q) => q.search("contactNom", args.query))
			.take(20)
	},
})

export const stats = query({
	args: {},
	handler: async (ctx) => {
		await getAuthUserWithRole(ctx)
		const all = await ctx.db.query("leads").collect()

		const byStatut: Record<string, number> = {}
		const montantByStatut: Record<string, number> = {}
		const bySource: Record<string, number> = {}
		const byType: Record<string, number> = {}
		const byPrestation: Record<string, number> = {}
		let totalMontant = 0
		let valides = 0
		let montantValide = 0

		// Monthly volume (last 6 months)
		const now = Date.now()
		const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000
		const monthlyVolume: Record<string, number> = {}

		for (const lead of all) {
			byStatut[lead.statut] = (byStatut[lead.statut] ?? 0) + 1
			if (lead.montantEstime) {
				totalMontant += lead.montantEstime
				montantByStatut[lead.statut] = (montantByStatut[lead.statut] ?? 0) + lead.montantEstime
			}
			if (lead.source) {
				bySource[lead.source] = (bySource[lead.source] ?? 0) + 1
			}
			if (lead.type) {
				byType[lead.type] = (byType[lead.type] ?? 0) + 1
			}
			if (lead.prestations) {
				for (const p of lead.prestations) {
					byPrestation[p] = (byPrestation[p] ?? 0) + 1
				}
			}
			if (lead.statut === "valide" || lead.statut === "onboarding") {
				valides++
				if (lead.montantEstime) montantValide += lead.montantEstime
			}
			// Monthly volume
			if (lead.createdAt >= sixMonthsAgo) {
				const d = new Date(lead.createdAt)
				const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
				monthlyVolume[key] = (monthlyVolume[key] ?? 0) + 1
			}
		}

		const closed = valides + (byStatut.perdu ?? 0)
		const tauxConversion = closed > 0 ? Math.round((valides / closed) * 100) : 0

		// Pipeline actif = tout sauf validé/onboarding/perdu
		const pipelineActif = all.filter(
			(l) => l.statut !== "valide" && l.statut !== "onboarding" && l.statut !== "perdu",
		)
		const montantPipeline = pipelineActif.reduce((sum, l) => sum + (l.montantEstime ?? 0), 0)

		return {
			total: all.length,
			byStatut,
			montantByStatut,
			bySource,
			byType,
			byPrestation,
			totalMontant,
			montantValide,
			montantPipeline,
			pipelineCount: pipelineActif.length,
			tauxConversion,
			monthlyVolume,
			recent: all.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
		}
	},
})

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = mutation({
	args: {
		contactNom: v.string(),
		contactPrenom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		entrepriseRaisonSociale: v.optional(v.string()),
		entrepriseSiren: v.optional(v.string()),
		entrepriseFormeJuridique: v.optional(v.string()),
		entrepriseCA: v.optional(v.number()),
		entrepriseNbSalaries: v.optional(v.number()),
		statut: v.optional(STATUT),
		type: v.optional(TYPE),
		prestations: v.optional(v.array(v.string())),
		source: v.optional(SOURCE),
		sourceDetail: v.optional(v.string()),
		responsableId: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()
		const statut = args.statut ?? "prise_de_contact"

		// Get max order for this statut
		const existing = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", statut))
			.collect()
		const maxOrder = existing.reduce((max, l) => Math.max(max, l.order), 0)

		const leadId = await ctx.db.insert("leads", {
			...args,
			statut,
			order: maxOrder + 1,
			createdAt: now,
			updatedAt: now,
		})

		// Notify responsable if assigned
		if (args.responsableId && args.responsableId !== user.id) {
			await ctx.db.insert("notifications", {
				userId: args.responsableId,
				type: "lead_assigne",
				titre: "Nouveau lead assigné",
				message: `Le lead "${args.contactNom}" vous a été assigné`,
				lien: `/leads/${leadId}`,
				isRead: false,
				createdAt: now,
			})
		}

		return leadId
	},
})

export const update = mutation({
	args: {
		id: v.id("leads"),
		contactNom: v.optional(v.string()),
		contactPrenom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		entrepriseRaisonSociale: v.optional(v.string()),
		entrepriseSiren: v.optional(v.string()),
		entrepriseFormeJuridique: v.optional(v.string()),
		entrepriseCA: v.optional(v.number()),
		entrepriseNbSalaries: v.optional(v.number()),
		type: v.optional(TYPE),
		prestations: v.optional(v.array(v.string())),
		source: v.optional(SOURCE),
		sourceDetail: v.optional(v.string()),
		rdvType: v.optional(RDV_TYPE),
		rdvDate: v.optional(v.number()),
		rdvNotes: v.optional(v.string()),
		responsableId: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const moveToStage = mutation({
	args: {
		id: v.id("leads"),
		statut: STATUT,
		raisonPerte: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const now = Date.now()

		// Validate: perdu requires raisonPerte
		if (args.statut === "perdu" && !args.raisonPerte) {
			throw new Error("La raison de perte est obligatoire")
		}

		// Get max order for target statut
		const existingInTarget = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", args.statut))
			.collect()
		const maxOrder = existingInTarget.reduce((max, l) => Math.max(max, l.order), 0)

		await ctx.db.patch(args.id, {
			statut: args.statut,
			order: maxOrder + 1,
			raisonPerte: args.raisonPerte,
			updatedAt: now,
		})

		// Auto-generate onboarding tasks when moving to "valide"
		if (args.statut === "valide") {
			const templates = await ctx.db.query("onboardingTemplates").withIndex("by_ordre").collect()
			const activeTemplates = templates.filter((t) => t.isActive)

			for (const template of activeTemplates) {
				await ctx.db.insert("onboardingTasks", {
					leadId: args.id,
					templateId: template._id,
					nom: template.nom,
					description: template.description,
					ordre: template.ordre,
					statut: "a_faire",
					createdAt: now,
					updatedAt: now,
				})
			}

			// Notify responsable
			if (lead.responsableId) {
				await ctx.db.insert("notifications", {
					userId: lead.responsableId,
					type: "lead_valide",
					titre: "Lead validé — Onboarding lancé",
					message: `Le lead "${lead.contactNom}" est validé. ${activeTemplates.length} tâches d'onboarding créées.`,
					lien: `/leads/${args.id}`,
					isRead: false,
					createdAt: now,
				})
			}
		}
	},
})

export const reorder = mutation({
	args: {
		id: v.id("leads"),
		statut: STATUT,
		newOrder: v.number(),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		await ctx.db.patch(args.id, {
			statut: args.statut,
			order: args.newOrder,
			updatedAt: Date.now(),
		})
	},
})

export const markAsLost = mutation({
	args: {
		id: v.id("leads"),
		raisonPerte: v.string(),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const existingInPerdu = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", "perdu"))
			.collect()
		const maxOrder = existingInPerdu.reduce((max, l) => Math.max(max, l.order), 0)

		await ctx.db.patch(args.id, {
			statut: "perdu",
			raisonPerte: args.raisonPerte,
			order: maxOrder + 1,
			updatedAt: Date.now(),
		})
	},
})

export const convertToClient = mutation({
	args: {
		id: v.id("leads"),
		raisonSociale: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent convertir un lead")
		}

		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const now = Date.now()
		const clientId = await ctx.db.insert("clients", {
			raisonSociale: args.raisonSociale,
			email: lead.contactEmail,
			telephone: lead.contactTelephone,
			siren: lead.entrepriseSiren,
			formeJuridique: lead.entrepriseFormeJuridique as any,
			caN1: lead.entrepriseCA,
			nombreEmployes: lead.entrepriseNbSalaries,
			status: "actif",
			managerId: lead.responsableId,
			createdAt: now,
			updatedAt: now,
		})

		// Create contact for the client
		if (lead.contactNom) {
			await ctx.db.insert("contacts", {
				clientId,
				nom: lead.contactNom,
				prenom: lead.contactPrenom,
				email: lead.contactEmail,
				telephone: lead.contactTelephone,
				isPrincipal: true,
			})
		}

		await ctx.db.patch(args.id, {
			clientId,
			updatedAt: now,
		})

		return clientId
	},
})

export const scheduleRdv = mutation({
	args: {
		id: v.id("leads"),
		rdvType: RDV_TYPE,
		rdvDate: v.number(),
		rdvNotes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await getAuthUserWithRole(ctx)
		await ctx.db.patch(args.id, {
			rdvType: args.rdvType,
			rdvDate: args.rdvDate,
			rdvNotes: args.rdvNotes,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("leads") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") throw new Error("Non autorisé")

		// Delete associated onboarding tasks
		const tasks = await ctx.db
			.query("onboardingTasks")
			.withIndex("by_lead", (q) => q.eq("leadId", args.id))
			.collect()
		for (const task of tasks) {
			await ctx.db.delete(task._id)
		}

		await ctx.db.delete(args.id)
	},
})

// ─── Internal mutation for API endpoint ─────────────────────────────────────

export const createFromApi = internalMutation({
	args: {
		contactNom: v.string(),
		contactPrenom: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactTelephone: v.optional(v.string()),
		entrepriseRaisonSociale: v.optional(v.string()),
		entrepriseSiren: v.optional(v.string()),
		source: v.optional(v.string()),
		sourceDetail: v.optional(v.string()),
		notes: v.optional(v.string()),
		type: v.optional(v.string()),
		prestations: v.optional(v.array(v.string())),
		montantEstime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now()
		const existing = await ctx.db
			.query("leads")
			.withIndex("by_statut", (q) => q.eq("statut", "prise_de_contact"))
			.collect()
		const maxOrder = existing.reduce((max, l) => Math.max(max, l.order), 0)

		return ctx.db.insert("leads", {
			contactNom: args.contactNom,
			contactPrenom: args.contactPrenom,
			contactEmail: args.contactEmail,
			contactTelephone: args.contactTelephone,
			entrepriseRaisonSociale: args.entrepriseRaisonSociale,
			entrepriseSiren: args.entrepriseSiren,
			source: args.source,
			sourceDetail: args.sourceDetail,
			notes: args.notes,
			type: args.type,
			prestations: args.prestations,
			montantEstime: args.montantEstime,
			statut: "prise_de_contact",
			order: maxOrder + 1,
			createdAt: now,
			updatedAt: now,
		})
	},
})
