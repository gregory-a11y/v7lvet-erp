import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthUserWithRole, safeGetAuthUserWithRole } from "./auth"

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
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []

		let leads: Doc<"leads">[]
		if (args.statut) {
			leads = await ctx.db
				.query("leads")
				.withIndex("by_statut_order", (q) => q.eq("statut", args.statut as any))
				.collect()
		} else if (args.responsableId) {
			leads = await ctx.db
				.query("leads")
				.withIndex("by_responsable", (q) => q.eq("responsableId", args.responsableId))
				.collect()
		} else {
			leads = await ctx.db.query("leads").collect()
		}

		// Permission cascade: collaborateur sees only assigned leads
		if (user.role === "collaborateur") {
			return leads.filter(
				(l) => l.responsableId === user.id || l.responsableHierarchiqueId === user.id,
			)
		}
		return leads
	},
})

export const listForKanban = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null
		const statuts = [
			"prise_de_contact",
			"rendez_vous",
			"qualification",
			"go_no_go",
			"valide",
			"onboarding",
			"perdu",
			"a_relancer",
		] as const
		const results = await Promise.all(
			statuts.map((statut) =>
				ctx.db
					.query("leads")
					.withIndex("by_statut_order", (q) => q.eq("statut", statut))
					.collect(),
			),
		)
		const grouped: Record<string, (typeof results)[0]> = {}
		for (let i = 0; i < statuts.length; i++) {
			let leads = results[i]
			if (user.role === "collaborateur") {
				leads = leads.filter(
					(l) => l.responsableId === user.id || l.responsableHierarchiqueId === user.id,
				)
			}
			grouped[statuts[i]] = leads
		}
		return grouped
	},
})

export const getById = query({
	args: { id: v.id("leads") },
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null
		const lead = await ctx.db.get(args.id)
		if (!lead) return null
		if (
			user.role === "collaborateur" &&
			lead.responsableId !== user.id &&
			lead.responsableHierarchiqueId !== user.id
		) {
			throw new Error("Non autorise")
		}
		return lead
	},
})

export const search = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return []
		if (!args.query.trim()) return []
		const results = await ctx.db
			.query("leads")
			.withSearchIndex("search_contact", (q) => q.search("contactNom", args.query))
			.take(20)

		// Permission cascade: collaborateur sees only assigned leads
		if (user.role === "collaborateur") {
			return results.filter(
				(l) => l.responsableId === user.id || l.responsableHierarchiqueId === user.id,
			)
		}
		return results
	},
})

export const stats = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeGetAuthUserWithRole(ctx)
		if (!user) return null
		let all = await ctx.db.query("leads").collect()

		// Permission cascade: collaborateur sees only assigned leads
		if (user.role === "collaborateur") {
			all = all.filter(
				(l) => l.responsableId === user.id || l.responsableHierarchiqueId === user.id,
			)
		}

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
			if (lead.prestationIds) {
				for (const pid of lead.prestationIds) {
					byPrestation[pid] = (byPrestation[pid] ?? 0) + 1
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
		prestationIds: v.optional(v.array(v.id("prestations"))),
		source: v.optional(SOURCE),
		sourceDetail: v.optional(v.string()),
		responsableId: v.optional(v.string()),
		responsableHierarchiqueId: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const now = Date.now()
		const statut = args.statut ?? "prise_de_contact"

		// Get max order for this statut
		const lastLead = await ctx.db
			.query("leads")
			.withIndex("by_statut_order", (q) => q.eq("statut", statut))
			.order("desc")
			.first()
		const maxOrder = lastLead?.order ?? 0

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

		await ctx.scheduler.runAfter(0, internal.auditLog.record, {
			userId: user.id,
			action: "create",
			resource: "lead",
			resourceId: leadId,
			details: args.contactNom,
		})

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
		prestationIds: v.optional(v.array(v.id("prestations"))),
		source: v.optional(SOURCE),
		sourceDetail: v.optional(v.string()),
		rdvType: v.optional(RDV_TYPE),
		rdvDate: v.optional(v.number()),
		rdvNotes: v.optional(v.string()),
		responsableId: v.optional(v.string()),
		responsableHierarchiqueId: v.optional(v.string()),
		montantEstime: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")
		// Collaborateurs can only update leads assigned to them
		if (
			user.role === "collaborateur" &&
			lead.responsableId !== user.id &&
			lead.responsableHierarchiqueId !== user.id
		) {
			throw new Error("Non autorise")
		}
		const { id, ...updates } = args
		await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
	},
})

export const moveToStage = mutation({
	args: {
		id: v.id("leads"),
		statut: STATUT,
		raisonPerte: v.optional(v.string()),
		onboardingAssigneId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") throw new Error("Non autorise")
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const now = Date.now()

		// Validate: perdu requires raisonPerte
		if (args.statut === "perdu" && !args.raisonPerte) {
			throw new Error("La raison de perte est obligatoire")
		}

		// Get max order for target statut
		const lastInTarget = await ctx.db
			.query("leads")
			.withIndex("by_statut_order", (q) => q.eq("statut", args.statut))
			.order("desc")
			.first()
		const maxOrder = lastInTarget?.order ?? 0

		await ctx.db.patch(args.id, {
			statut: args.statut,
			order: maxOrder + 1,
			raisonPerte: args.raisonPerte,
			updatedAt: now,
		})

		// Auto-generate onboarding todos when moving to "valide"
		if (args.statut === "valide") {
			// Anti-doublon: check existing onboarding todos for this lead
			const existingTodos = await ctx.db
				.query("todos")
				.withIndex("by_lead", (q) => q.eq("leadId", args.id))
				.collect()
			const hasOnboardingTodos = existingTodos.some((t) => t.categorie === "onboarding")

			if (!hasOnboardingTodos) {
				// Auto-seed "onboarding" category in leadOptions if missing
				const existingCategories = await ctx.db
					.query("leadOptions")
					.withIndex("by_category", (q) => q.eq("category", "todo_categorie"))
					.collect()
				if (!existingCategories.some((o) => o.value === "onboarding")) {
					const maxCatOrder = existingCategories.reduce((max, o) => Math.max(max, o.order), 0)
					await ctx.db.insert("leadOptions", {
						category: "todo_categorie",
						value: "onboarding",
						label: "Onboarding",
						color: "#2E6965",
						order: maxCatOrder + 1,
						isDefault: true,
						isActive: true,
						createdAt: now,
					})
				}

				const templates = await ctx.db.query("onboardingTemplates").withIndex("by_ordre").collect()
				const activeTemplates = templates.filter((t) => t.isActive)
				const assigneId = args.onboardingAssigneId ?? lead.responsableId

				for (const template of activeTemplates) {
					await ctx.db.insert("todos", {
						titre: template.nom,
						description: template.description,
						statut: "a_faire",
						priorite: "normale",
						categorie: "onboarding",
						leadId: args.id,
						assigneId,
						order: template.ordre,
						createdById: user.id as string,
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

				// Notify assigné if different from responsable
				if (assigneId && assigneId !== lead.responsableId) {
					await ctx.db.insert("notifications", {
						userId: assigneId,
						type: "onboarding_assigne",
						titre: "Onboarding assigné",
						message: `Vous êtes responsable de l'onboarding du lead "${lead.contactNom}". ${activeTemplates.length} tâches à réaliser.`,
						lien: `/leads/${args.id}`,
						isRead: false,
						createdAt: now,
					})
				}
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
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") throw new Error("Non autorise")
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")
		// Prevent cross-status reorder — status change must go through moveToStage
		if (lead.statut !== args.statut) {
			throw new Error("Changement de statut interdit via reorder — utilisez moveToStage")
		}
		await ctx.db.patch(args.id, {
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
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") throw new Error("Non autorise")
		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const lastInPerdu = await ctx.db
			.query("leads")
			.withIndex("by_statut_order", (q) => q.eq("statut", "perdu"))
			.order("desc")
			.first()
		const maxOrder = lastInPerdu?.order ?? 0

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
		responsableOperationnelId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Accès refusé : seuls les managers et admins peuvent convertir un lead")
		}

		const lead = await ctx.db.get(args.id)
		if (!lead) throw new Error("Lead introuvable")

		const now = Date.now()
		// Validate formeJuridique against allowed values
		const FORMES_JURIDIQUES = [
			"SARL",
			"SAS",
			"SA",
			"SASU",
			"EI",
			"SNC",
			"SCI",
			"EURL",
			"SELARL",
			"SCM",
			"SCP",
			"Auto-entrepreneur",
			"Micro-entreprise",
			"Autre",
		] as const
		type FormeJuridique = (typeof FORMES_JURIDIQUES)[number]
		const validForme =
			lead.entrepriseFormeJuridique &&
			(FORMES_JURIDIQUES as readonly string[]).includes(lead.entrepriseFormeJuridique)
				? (lead.entrepriseFormeJuridique as FormeJuridique)
				: undefined
		const clientId = await ctx.db.insert("clients", {
			raisonSociale: args.raisonSociale,
			email: lead.contactEmail,
			telephone: lead.contactTelephone,
			siren: lead.entrepriseSiren,
			formeJuridique: validForme,
			caN1: lead.entrepriseCA,
			nombreEmployes: lead.entrepriseNbSalaries,
			status: "actif",
			responsableOperationnelId: args.responsableOperationnelId ?? lead.responsableId,
			responsableHierarchiqueId: lead.responsableHierarchiqueId,
			prestationIds: lead.prestationIds,
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

		// Propagate clientId to onboarding todos + reassign if responsableOperationnelId provided
		const leadTodos = await ctx.db
			.query("todos")
			.withIndex("by_lead", (q) => q.eq("leadId", args.id))
			.collect()
		for (const todo of leadTodos) {
			const patch: Record<string, unknown> = { clientId, updatedAt: now }
			if (args.responsableOperationnelId && todo.categorie === "onboarding") {
				patch.assigneId = args.responsableOperationnelId
			}
			await ctx.db.patch(todo._id, patch)
		}

		await ctx.db.patch(args.id, {
			clientId,
			updatedAt: now,
		})

		await ctx.scheduler.runAfter(0, internal.auditLog.record, {
			userId: user.id,
			action: "convert_to_client",
			resource: "lead",
			resourceId: args.id,
			details: `${lead.contactNom} → client ${args.raisonSociale}`,
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
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			const lead = await ctx.db.get(args.id)
			if (!lead || (lead.responsableId !== user.id && lead.responsableHierarchiqueId !== user.id)) {
				throw new Error("Non autorise")
			}
		}
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

		const lead = await ctx.db.get(args.id)
		await ctx.scheduler.runAfter(0, internal.auditLog.record, {
			userId: user.id,
			action: "delete",
			resource: "lead",
			resourceId: args.id,
			details: lead?.contactNom,
		})

		// Delete associated onboarding tasks (legacy)
		const tasks = await ctx.db
			.query("onboardingTasks")
			.withIndex("by_lead", (q) => q.eq("leadId", args.id))
			.collect()
		for (const task of tasks) {
			await ctx.db.delete(task._id)
		}

		// Delete associated todos and their comments
		const todos = await ctx.db
			.query("todos")
			.withIndex("by_lead", (q) => q.eq("leadId", args.id))
			.collect()
		for (const todo of todos) {
			const comments = await ctx.db
				.query("todoComments")
				.withIndex("by_todo", (q) => q.eq("todoId", todo._id))
				.collect()
			for (const c of comments) await ctx.db.delete(c._id)
			await ctx.db.delete(todo._id)
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
		prestationIds: v.optional(v.array(v.id("prestations"))),
		montantEstime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now()
		const lastLead = await ctx.db
			.query("leads")
			.withIndex("by_statut_order", (q) => q.eq("statut", "prise_de_contact"))
			.order("desc")
			.first()
		const maxOrder = lastLead?.order ?? 0

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
			prestationIds: args.prestationIds,
			montantEstime: args.montantEstime,
			statut: "prise_de_contact",
			order: maxOrder + 1,
			createdAt: now,
			updatedAt: now,
		})
	},
})
