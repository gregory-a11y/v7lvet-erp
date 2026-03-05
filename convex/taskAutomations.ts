import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx, mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"

// =============================================================================
// VALIDATORS
// =============================================================================

const modeValidator = v.union(v.literal("equipe"), v.literal("client"))
const cibleEquipeValidator = v.optional(
	v.union(v.literal("tous"), v.literal("par_role"), v.literal("par_fonction")),
)
const cibleRoleValidator = v.optional(
	v.union(v.literal("admin"), v.literal("manager"), v.literal("collaborateur")),
)
const assignationClientValidator = v.optional(
	v.union(v.literal("responsable_operationnel"), v.literal("responsable_hierarchique")),
)
const planificationTypeValidator = v.union(v.literal("frequence"), v.literal("date_relative"))
const frequenceValidator = v.optional(
	v.union(
		v.literal("quotidien"),
		v.literal("hebdomadaire"),
		v.literal("mensuel"),
		v.literal("trimestriel"),
		v.literal("annuel"),
	),
)
const dateReferenceValidator = v.optional(
	v.union(
		v.literal("dateClotureComptable"),
		v.literal("dateEntree"),
		v.literal("jourTVA"),
		v.literal("datePaiementDividendes"),
	),
)
const periodeRelativeValidator = v.optional(
	v.union(v.literal("annuel"), v.literal("selon_frequence_tva")),
)
const prioriteValidator = v.union(
	v.literal("basse"),
	v.literal("normale"),
	v.literal("haute"),
	v.literal("urgente"),
)

const tacheItemValidator = v.object({
	id: v.string(),
	titre: v.string(),
	description: v.optional(v.string()),
	priorite: prioriteValidator,
	categorie: v.optional(v.string()),
	tags: v.optional(v.array(v.string())),
	echeanceJoursApres: v.optional(v.number()),
	sopIds: v.optional(v.array(v.id("sops"))),
})

// Common args for create/update
const automationFields = {
	nom: v.string(),
	description: v.optional(v.string()),
	mode: modeValidator,
	cibleEquipe: cibleEquipeValidator,
	cibleRole: cibleRoleValidator,
	cibleFonctionId: v.optional(v.id("fonctions")),
	assignationClient: assignationClientValidator,
	filtresPrestationIds: v.optional(v.array(v.id("prestations"))),
	filtresFormeJuridique: v.optional(v.string()),
	filtresRegimeTVA: v.optional(v.string()),
	filtresCategorieFiscale: v.optional(v.string()),
	filtresActivite: v.optional(v.string()),
	filtresFrequenceTVA: v.optional(v.string()),
	planificationType: planificationTypeValidator,
	frequence: frequenceValidator,
	jourSemaine: v.optional(v.number()),
	jourMois: v.optional(v.number()),
	moisTrimestre: v.optional(v.number()),
	moisAnnee: v.optional(v.number()),
	dateReference: dateReferenceValidator,
	joursDecalage: v.optional(v.number()),
	periodeRelative: periodeRelativeValidator,
	taches: v.array(tacheItemValidator),
}

// =============================================================================
// UTILS
// =============================================================================

const MOIS_FR = [
	"janvier",
	"février",
	"mars",
	"avril",
	"mai",
	"juin",
	"juillet",
	"août",
	"septembre",
	"octobre",
	"novembre",
	"décembre",
]

function getTrimestre(month: number): string {
	if (month <= 3) return "T1"
	if (month <= 6) return "T2"
	if (month <= 9) return "T3"
	return "T4"
}

function formatDateYMD(ts: number): string {
	const d = new Date(ts)
	const y = d.getUTCFullYear()
	const m = String(d.getUTCMonth() + 1).padStart(2, "0")
	const day = String(d.getUTCDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

/** Compute next execution timestamp */
function computeNextExecution(
	auto: {
		planificationType: string
		frequence?: string
		jourSemaine?: number
		jourMois?: number
		moisTrimestre?: number
		moisAnnee?: number
		dateReference?: string
	},
	now: number,
): number {
	const d = new Date(now)
	const todayUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6, 30)

	if (auto.planificationType === "date_relative") {
		// Check daily — next day at 6:30 UTC
		const tomorrow = todayUTC + 24 * 60 * 60 * 1000
		return tomorrow
	}

	const freq = auto.frequence
	if (freq === "quotidien") {
		return todayUTC + 24 * 60 * 60 * 1000
	}

	if (freq === "hebdomadaire") {
		const targetDay = auto.jourSemaine ?? 0 // 0=lundi
		// JS getUTCDay: 0=sunday, convert: lundi=1
		const jsTarget = targetDay === 6 ? 0 : targetDay + 1
		const current = d.getUTCDay()
		let diff = jsTarget - current
		if (diff <= 0) diff += 7
		return todayUTC + diff * 24 * 60 * 60 * 1000
	}

	if (freq === "mensuel") {
		const targetDay = auto.jourMois ?? 1
		let year = d.getUTCFullYear()
		let month = d.getUTCMonth()
		// If current day >= target, move to next month
		if (d.getUTCDate() >= targetDay) {
			month++
			if (month > 11) {
				month = 0
				year++
			}
		}
		const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
		const day = Math.min(targetDay, maxDay)
		return Date.UTC(year, month, day, 6, 30)
	}

	if (freq === "trimestriel") {
		const targetDay = auto.jourMois ?? 1
		const moisTri = (auto.moisTrimestre ?? 1) - 1 // 0-indexed within quarter
		const currentMonth = d.getUTCMonth()
		const currentQuarter = Math.floor(currentMonth / 3)
		let targetQuarter = currentQuarter
		const targetMonth = targetQuarter * 3 + moisTri

		if (
			targetMonth < currentMonth ||
			(targetMonth === currentMonth && d.getUTCDate() >= targetDay)
		) {
			targetQuarter++
		}

		let year = d.getUTCFullYear()
		let finalMonth = targetQuarter * 3 + moisTri
		if (finalMonth > 11) {
			finalMonth -= 12
			year++
		}
		const maxDay = new Date(Date.UTC(year, finalMonth + 1, 0)).getUTCDate()
		const day = Math.min(targetDay, maxDay)
		return Date.UTC(year, finalMonth, day, 6, 30)
	}

	if (freq === "annuel") {
		const targetDay = auto.jourMois ?? 1
		const targetMonth = (auto.moisAnnee ?? 1) - 1
		let year = d.getUTCFullYear()
		const candidate = Date.UTC(year, targetMonth, Math.min(targetDay, 28), 6, 30)
		if (candidate <= now) {
			year++
		}
		const maxDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate()
		return Date.UTC(year, targetMonth, Math.min(targetDay, maxDay), 6, 30)
	}

	// Fallback: tomorrow
	return todayUTC + 24 * 60 * 60 * 1000
}

/** Replace template variables */
function interpolateVariables(
	template: string,
	context: {
		client?: string
		mois?: string
		annee?: string
		prestation?: string
		responsable?: string
		trimestre?: string
	},
): string {
	let result = template
	if (context.client) result = result.replace(/\{\{client\}\}/g, context.client)
	if (context.mois) result = result.replace(/\{\{mois\}\}/g, context.mois)
	if (context.annee) result = result.replace(/\{\{annee\}\}/g, context.annee)
	if (context.prestation) result = result.replace(/\{\{prestation\}\}/g, context.prestation)
	if (context.responsable) result = result.replace(/\{\{responsable\}\}/g, context.responsable)
	if (context.trimestre) result = result.replace(/\{\{trimestre\}\}/g, context.trimestre)
	return result
}

/** Check if a client matches all filters (AND logic) */
function matchesClientFilters(client: Doc<"clients">, auto: Doc<"taskAutomations">): boolean {
	if (auto.filtresFormeJuridique && client.formeJuridique !== auto.filtresFormeJuridique)
		return false
	if (auto.filtresRegimeTVA && client.regimeTVA !== auto.filtresRegimeTVA) return false
	if (auto.filtresCategorieFiscale && client.categorieFiscale !== auto.filtresCategorieFiscale)
		return false
	if (auto.filtresActivite && client.activite !== auto.filtresActivite) return false
	if (auto.filtresFrequenceTVA && client.frequenceTVA !== auto.filtresFrequenceTVA) return false

	// Prestation filter: client must have AT LEAST ONE of the specified prestations
	if (auto.filtresPrestationIds && auto.filtresPrestationIds.length > 0) {
		const clientPrestations = client.prestationIds ?? []
		const hasMatch = auto.filtresPrestationIds.some((pid) => clientPrestations.includes(pid))
		if (!hasMatch) return false
	}

	return true
}

/** Parse a DD/MM date reference into a concrete date (array of timestamps for the year) */
function parseDateReference(
	client: Doc<"clients">,
	dateRef: string,
	joursDecalage: number,
	year: number,
): number[] {
	const dates: number[] = []

	if (dateRef === "dateEntree" && client.dateEntree) {
		const d = new Date(client.dateEntree)
		const target = Date.UTC(year, d.getUTCMonth(), d.getUTCDate())
		dates.push(target + joursDecalage * 24 * 60 * 60 * 1000)
		return dates
	}

	// DD/MM format fields
	let ddmm: string | undefined
	if (dateRef === "dateClotureComptable") ddmm = client.dateClotureComptable
	else if (dateRef === "datePaiementDividendes") ddmm = client.datePaiementDividendes
	else if (dateRef === "jourTVA" && client.jourTVA) {
		// jourTVA is a number (day of month), frequency determines months
		const day = client.jourTVA
		const freq = client.frequenceTVA
		if (freq === "mensuelle") {
			for (let m = 0; m < 12; m++) {
				const maxDay = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
				const target = Date.UTC(year, m, Math.min(day, maxDay))
				dates.push(target + joursDecalage * 24 * 60 * 60 * 1000)
			}
		} else if (freq === "trimestrielle") {
			for (const m of [2, 5, 8, 11]) {
				// mars, juin, sept, dec
				const maxDay = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
				const target = Date.UTC(year, m, Math.min(day, maxDay))
				dates.push(target + joursDecalage * 24 * 60 * 60 * 1000)
			}
		} else {
			// annuelle — one date
			const target = Date.UTC(year, 0, Math.min(day, 31))
			dates.push(target + joursDecalage * 24 * 60 * 60 * 1000)
		}
		return dates
	}

	if (ddmm) {
		const parts = ddmm.split("/")
		if (parts.length === 2) {
			const day = Number.parseInt(parts[0], 10)
			const month = Number.parseInt(parts[1], 10) - 1
			if (!Number.isNaN(day) && !Number.isNaN(month)) {
				const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
				const target = Date.UTC(year, month, Math.min(day, maxDay))
				dates.push(target + joursDecalage * 24 * 60 * 60 * 1000)
			}
		}
	}

	return dates
}

// =============================================================================
// QUERIES
// =============================================================================

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		const automations = await ctx.db.query("taskAutomations").collect()

		// Enrich with fonction name + prestation titles
		return Promise.all(
			automations.map(async (auto) => {
				let fonctionNom: string | undefined
				if (auto.cibleFonctionId) {
					const fn = await ctx.db.get(auto.cibleFonctionId)
					fonctionNom = fn?.nom
				}

				let prestationTitres: string[] = []
				if (auto.filtresPrestationIds && auto.filtresPrestationIds.length > 0) {
					const prestas = await Promise.all(auto.filtresPrestationIds.map((id) => ctx.db.get(id)))
					prestationTitres = prestas.filter(Boolean).map((p) => p!.titre)
				}

				return { ...auto, fonctionNom, prestationTitres, tachesCount: auto.taches.length }
			}),
		)
	},
})

export const getById = query({
	args: { id: v.id("taskAutomations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")
		return ctx.db.get(args.id)
	},
})

export const listLogs = query({
	args: { automationId: v.id("taskAutomations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		const logs = await ctx.db
			.query("taskAutomationLogs")
			.withIndex("by_automation", (q) => q.eq("automationId", args.automationId))
			.order("desc")
			.take(50)

		return logs
	},
})

// =============================================================================
// MUTATIONS
// =============================================================================

export const create = mutation({
	args: automationFields,
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		const now = Date.now()
		const nextExec = computeNextExecution(args, now)

		const id = await ctx.db.insert("taskAutomations", {
			...args,
			isActive: true,
			nextExecutionAt: nextExec,
			createdById: user.id as string,
			createdAt: now,
			updatedAt: now,
		})
		return id
	},
})

export const update = mutation({
	args: { id: v.id("taskAutomations"), ...automationFields },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		const existing = await ctx.db.get(args.id)
		if (!existing) throw new Error("Automation non trouvée")

		const now = Date.now()
		const { id, ...updates } = args

		// Recalculate next execution if scheduling changed
		const nextExec = existing.isActive ? computeNextExecution(updates, now) : undefined

		await ctx.db.patch(id, {
			...updates,
			nextExecutionAt: nextExec,
			updatedAt: now,
		})
	},
})

export const remove = mutation({
	args: { id: v.id("taskAutomations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		// Delete associated logs
		const logs = await ctx.db
			.query("taskAutomationLogs")
			.withIndex("by_automation", (q) => q.eq("automationId", args.id))
			.collect()
		for (const log of logs) {
			await ctx.db.delete(log._id)
		}

		await ctx.db.delete(args.id)
	},
})

export const toggleActive = mutation({
	args: { id: v.id("taskAutomations") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Réservé aux administrateurs")

		const auto = await ctx.db.get(args.id)
		if (!auto) throw new Error("Automation non trouvée")

		const newActive = !auto.isActive
		const now = Date.now()

		await ctx.db.patch(args.id, {
			isActive: newActive,
			nextExecutionAt: newActive ? computeNextExecution(auto, now) : undefined,
			updatedAt: now,
		})
	},
})

// =============================================================================
// EXECUTION ENGINE (internal)
// =============================================================================

export const executeAutomations = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()

		// Find active automations ready to execute
		const automations = await ctx.db
			.query("taskAutomations")
			.withIndex("by_nextExecution")
			.collect()

		const ready = automations.filter(
			(a) => a.isActive && a.nextExecutionAt && a.nextExecutionAt <= now,
		)

		// Schedule each one individually to avoid timeout
		for (const auto of ready) {
			await ctx.scheduler.runAfter(0, internal.taskAutomations.executeOneAutomation, {
				automationId: auto._id,
			})
		}

		return { scheduled: ready.length }
	},
})

/** Helper: create todos for each tache in auto.taches */
async function createTodosForTaches(
	ctx: MutationCtx,
	auto: Doc<"taskAutomations">,
	interpolationContext: {
		client?: string
		mois?: string
		annee?: string
		prestation?: string
		responsable?: string
		trimestre?: string
	},
	assigneId: string | undefined,
	clientId?: Id<"clients">,
	now?: number,
): Promise<{ created: number; errors: string[] }> {
	const timestamp = now ?? Date.now()
	let created = 0
	const errors: string[] = []

	for (const tache of auto.taches) {
		try {
			const titre = interpolateVariables(tache.titre, interpolationContext)
			const maxOrder = await getMaxTodoOrder(ctx)
			await ctx.db.insert("todos", {
				titre,
				description: tache.description,
				statut: "a_faire",
				priorite: tache.priorite,
				dateEcheance: tache.echeanceJoursApres
					? timestamp + tache.echeanceJoursApres * 24 * 60 * 60 * 1000
					: undefined,
				assigneId,
				categorie: tache.categorie,
				clientId,
				tags: tache.tags,
				automationId: auto._id,
				order: maxOrder + 1,
				createdById: auto.createdById,
				createdAt: timestamp,
				updatedAt: timestamp,
			})
			created++
		} catch (e: unknown) {
			errors.push(`Tâche "${tache.titre}": ${(e as Error).message}`)
		}
	}

	return { created, errors }
}

export const executeOneAutomation = internalMutation({
	args: { automationId: v.id("taskAutomations") },
	handler: async (ctx, args) => {
		const auto = await ctx.db.get(args.automationId)
		if (!auto || !auto.isActive) return

		const now = Date.now()
		const today = formatDateYMD(now)
		const allErrors: string[] = []
		let totalTodosCreated = 0

		if (auto.mode === "equipe") {
			// ---- MODE EQUIPE ----
			const idempKey = `${auto._id}_${today}`
			const existing = await ctx.db
				.query("taskAutomationLogs")
				.withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempKey))
				.first()
			if (existing) {
				// Already executed today
				await ctx.db.patch(auto._id, {
					nextExecutionAt: computeNextExecution(auto, now),
					updatedAt: now,
				})
				return
			}

			// Get target members
			let members: Doc<"userProfiles">[] = []
			if (auto.cibleEquipe === "tous") {
				members = await ctx.db.query("userProfiles").collect()
			} else if (auto.cibleEquipe === "par_role" && auto.cibleRole) {
				members = await ctx.db
					.query("userProfiles")
					.withIndex("by_role", (q) => q.eq("role", auto.cibleRole!))
					.collect()
			} else if (auto.cibleEquipe === "par_fonction" && auto.cibleFonctionId) {
				const all = await ctx.db.query("userProfiles").collect()
				members = all.filter((m) => m.fonctionId === auto.cibleFonctionId)
			}

			const d = new Date(now)
			const mois = MOIS_FR[d.getUTCMonth()]
			const annee = String(d.getUTCFullYear())
			const trimestre = getTrimestre(d.getUTCMonth() + 1)

			for (const member of members) {
				const { created, errors } = await createTodosForTaches(
					ctx,
					auto,
					{ mois, annee, trimestre, responsable: member.nom },
					member.userId,
					undefined,
					now,
				)
				totalTodosCreated += created
				if (errors.length > 0) {
					allErrors.push(...errors.map((e) => `Membre ${member.nom}: ${e}`))
				}
			}

			// Log
			await ctx.db.insert("taskAutomationLogs", {
				automationId: auto._id,
				executedAt: now,
				idempotencyKey: idempKey,
				todosCreated: totalTodosCreated,
				errors: allErrors.length > 0 ? allErrors : undefined,
			})
		} else {
			// ---- MODE CLIENT ----
			const activeClients = await ctx.db
				.query("clients")
				.withIndex("by_status", (q) => q.eq("status", "actif"))
				.collect()
			const matchingClients = activeClients.filter((c) => matchesClientFilters(c, auto))

			if (auto.planificationType === "frequence") {
				const idempKey = `${auto._id}_${today}`
				const existing = await ctx.db
					.query("taskAutomationLogs")
					.withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempKey))
					.first()
				if (existing) {
					await ctx.db.patch(auto._id, {
						nextExecutionAt: computeNextExecution(auto, now),
						updatedAt: now,
					})
					return
				}

				const d = new Date(now)
				const mois = MOIS_FR[d.getUTCMonth()]
				const annee = String(d.getUTCFullYear())
				const trimestre = getTrimestre(d.getUTCMonth() + 1)

				for (const client of matchingClients) {
					const assigneId =
						auto.assignationClient === "responsable_hierarchique"
							? client.responsableHierarchiqueId
							: client.responsableOperationnelId

					// Resolve responsable name
					let responsableNom: string | undefined
					if (assigneId) {
						const profile = await ctx.db
							.query("userProfiles")
							.withIndex("by_userId", (q) => q.eq("userId", assigneId))
							.first()
						responsableNom = profile?.nom
					}

					// Resolve prestations
					let prestationStr: string | undefined
					if (client.prestationIds && client.prestationIds.length > 0) {
						const prestas = await Promise.all(client.prestationIds.map((id) => ctx.db.get(id)))
						prestationStr = prestas
							.filter(Boolean)
							.map((p) => p!.titre)
							.join(", ")
					}

					const { created, errors } = await createTodosForTaches(
						ctx,
						auto,
						{
							client: client.raisonSociale,
							mois,
							annee,
							trimestre,
							responsable: responsableNom,
							prestation: prestationStr,
						},
						assigneId,
						client._id,
						now,
					)
					totalTodosCreated += created
					if (errors.length > 0) {
						allErrors.push(...errors.map((e) => `Client ${client.raisonSociale}: ${e}`))
					}
				}

				await ctx.db.insert("taskAutomationLogs", {
					automationId: auto._id,
					executedAt: now,
					idempotencyKey: idempKey,
					todosCreated: totalTodosCreated,
					errors: allErrors.length > 0 ? allErrors : undefined,
				})
			} else {
				// date_relative — check each client individually
				const d = new Date(now)
				const year = d.getUTCFullYear()
				const todayStart = Date.UTC(year, d.getUTCMonth(), d.getUTCDate())
				const todayEnd = todayStart + 24 * 60 * 60 * 1000

				const mois = MOIS_FR[d.getUTCMonth()]
				const annee = String(year)
				const trimestre = getTrimestre(d.getUTCMonth() + 1)

				for (const client of matchingClients) {
					if (!auto.dateReference) continue

					const targetDates = parseDateReference(
						client,
						auto.dateReference,
						auto.joursDecalage ?? 0,
						year,
					)

					for (const targetTs of targetDates) {
						if (targetTs < todayStart || targetTs >= todayEnd) continue

						const dateCible = formatDateYMD(targetTs)
						const idempKey = `${auto._id}_${client._id}_${dateCible}`
						const existing = await ctx.db
							.query("taskAutomationLogs")
							.withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempKey))
							.first()
						if (existing) continue

						const assigneId =
							auto.assignationClient === "responsable_hierarchique"
								? client.responsableHierarchiqueId
								: client.responsableOperationnelId

						let responsableNom: string | undefined
						if (assigneId) {
							const profile = await ctx.db
								.query("userProfiles")
								.withIndex("by_userId", (q) => q.eq("userId", assigneId))
								.first()
							responsableNom = profile?.nom
						}

						let prestationStr: string | undefined
						if (client.prestationIds && client.prestationIds.length > 0) {
							const prestas = await Promise.all(client.prestationIds.map((id) => ctx.db.get(id)))
							prestationStr = prestas
								.filter(Boolean)
								.map((p) => p!.titre)
								.join(", ")
						}

						const { created, errors } = await createTodosForTaches(
							ctx,
							auto,
							{
								client: client.raisonSociale,
								mois,
								annee,
								trimestre,
								responsable: responsableNom,
								prestation: prestationStr,
							},
							assigneId,
							client._id,
							now,
						)
						totalTodosCreated += created

						await ctx.db.insert("taskAutomationLogs", {
							automationId: auto._id,
							executedAt: now,
							idempotencyKey: idempKey,
							todosCreated: created,
							errors: errors.length > 0 ? errors : undefined,
						})

						if (errors.length > 0) {
							allErrors.push(
								...errors.map((e) => `Client ${client.raisonSociale} (${dateCible}): ${e}`),
							)
						}
					}
				}

				// Global log for date_relative if any errors
				if (allErrors.length > 0) {
					await ctx.db.insert("taskAutomationLogs", {
						automationId: auto._id,
						executedAt: now,
						idempotencyKey: `${auto._id}_errors_${today}`,
						todosCreated: totalTodosCreated,
						errors: allErrors,
					})
				}
			}
		}

		// Update tracking
		await ctx.db.patch(auto._id, {
			lastExecutedAt: now,
			nextExecutionAt: computeNextExecution(auto, now),
			updatedAt: now,
		})
	},
})

/** Helper to get max order for todos (avoid duplicating in multiple places) */
async function getMaxTodoOrder(ctx: MutationCtx): Promise<number> {
	const recent = await ctx.db.query("todos").take(500)
	return recent.reduce((max: number, t: Doc<"todos">) => Math.max(max, t.order ?? 0), 0)
}
