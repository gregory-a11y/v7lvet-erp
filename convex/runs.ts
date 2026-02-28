import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { type MutationCtx, mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"
import { evaluateRules } from "./fiscalEngine"
import type { MindmapEdge, MindmapNode } from "./fiscalMindmapEngine"
import { traverseMindmap } from "./fiscalMindmapEngine"

const runStatusValidator = v.union(
	v.literal("a_venir"),
	v.literal("en_cours"),
	v.literal("en_attente"),
	v.literal("termine"),
)

// ─── Date utilities ──────────────────────────────────────────────────────────

function parseDateCloture(
	dateStr: string | undefined,
	_exercice: number,
): { day: number; month: number } {
	if (!dateStr) return { day: 31, month: 12 }
	const parts = dateStr.split("/")
	if (parts.length !== 2) return { day: 31, month: 12 }
	return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10) }
}

function dateCloture(cloture: { day: number; month: number }, exercice: number): Date {
	// If cloture is 31/12, it's end of exercice year. Otherwise it could be in exercice year.
	return new Date(exercice, cloture.month - 1, cloture.day)
}

function addMonthsAndDays(date: Date, months: number, days: number = 0): number {
	const d = new Date(date)
	d.setMonth(d.getMonth() + months)
	if (days > 0) d.setDate(d.getDate() + days)
	return d.getTime()
}

function fixedDate(day: number, month: number, year: number): number {
	return new Date(year, month - 1, day).getTime()
}

function addDaysToTimestamp(ts: number, days: number): number {
	return ts + days * 86400000
}

function lastDayOfMonth(month: number, year: number): number {
	return new Date(year, month, 0).getDate()
}

function endOfMonth(month: number, year: number): number {
	const day = lastDayOfMonth(month, year)
	return new Date(year, month - 1, day).getTime()
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
	args: {
		clientId: v.optional(v.id("clients")),
		dossierId: v.optional(v.id("dossiers")),
		status: v.optional(runStatusValidator),
		exercice: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		let runs: Doc<"runs">[]

		if (args.clientId) {
			runs = await ctx.db
				.query("runs")
				.withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
				.take(200)
		} else if (args.dossierId) {
			runs = await ctx.db
				.query("runs")
				.withIndex("by_dossier", (q) => q.eq("dossierId", args.dossierId!))
				.take(200)
		} else if (args.status) {
			const status = args.status
			runs = await ctx.db
				.query("runs")
				.withIndex("by_status", (q) => q.eq("status", status))
				.take(200)
		} else {
			runs = await ctx.db.query("runs").take(200)
		}

		// Filter by exercice if provided
		if (args.exercice) {
			runs = runs.filter((r) => r.exercice === args.exercice)
		}

		// Filter by status if not already done via index
		if (args.status && !args.dossierId && !args.clientId) {
			// Already filtered by index
		} else if (args.status) {
			runs = runs.filter((r) => r.status === args.status)
		}

		// Permission cascade
		if (user.role === "manager") {
			const clientIds = new Set<string>()
			const managerId = user.id
			const allClients = await ctx.db
				.query("clients")
				.withIndex("by_manager", (q) => q.eq("managerId", managerId))
				.take(200)
			for (const c of allClients) clientIds.add(c._id)
			runs = runs.filter((r) => clientIds.has(r.clientId))
		} else if (user.role === "collaborateur") {
			const collaborateurId = user.id
			const dossiers = await ctx.db
				.query("dossiers")
				.withIndex("by_collaborateur", (q) => q.eq("collaborateurId", collaborateurId))
				.take(500)
			const clientIds = new Set(dossiers.map((d) => d.clientId))
			runs = runs.filter((r) => clientIds.has(r.clientId))
		}

		// Batch-fetch clients (avoid N+1)
		const uniqueClientIds = [...new Set(runs.map((r) => r.clientId))]
		const clients = await Promise.all(uniqueClientIds.map((id) => ctx.db.get(id)))
		const clientMap = new Map(clients.filter(Boolean).map((c) => [c!._id, c!.raisonSociale]))

		// Batch-fetch taches for all runs (capped per run to avoid loading too many)
		const allTaches = await Promise.all(
			runs.map((run) =>
				ctx.db
					.query("taches")
					.withIndex("by_run", (q) => q.eq("runId", run._id))
					.take(200),
			),
		)

		const enriched = runs.map((run, i) => {
			const taches = allTaches[i]
			const done = taches.filter((t) => t.status === "termine").length
			return {
				...run,
				clientName: clientMap.get(run.clientId) ?? "—",
				tachesTotal: taches.length,
				tachesDone: done,
			}
		})

		return enriched
	},
})

export const getById = query({
	args: { id: v.id("runs") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const run = await ctx.db.get(args.id)
		if (!run) return null

		const client = await ctx.db.get(run.clientId)
		const taches = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", run._id))
			.collect()

		// Sort by dateEcheance ASC (nulls last)
		taches.sort((a, b) => {
			if (!a.dateEcheance && !b.dateEcheance) return 0
			if (!a.dateEcheance) return 1
			if (!b.dateEcheance) return -1
			return a.dateEcheance - b.dateEcheance
		})

		const done = taches.filter((t) => t.status === "termine").length

		return {
			...run,
			clientName: client?.raisonSociale ?? "—",
			client,
			taches,
			tachesTotal: taches.length,
			tachesDone: done,
		}
	},
})

export const listByClient = query({
	args: { clientId: v.id("clients") },
	handler: async (ctx, args) => {
		const _user = await getAuthUserWithRole(ctx)

		const runs = await ctx.db
			.query("runs")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()

		const enriched = await Promise.all(
			runs.map(async (run) => {
				const taches = await ctx.db
					.query("taches")
					.withIndex("by_run", (q) => q.eq("runId", run._id))
					.collect()
				const done = taches.filter((t) => t.status === "termine").length
				const sortedTaches = taches.sort((a, b) => {
					if (!a.dateEcheance && !b.dateEcheance) return 0
					if (!a.dateEcheance) return 1
					if (!b.dateEcheance) return -1
					return a.dateEcheance - b.dateEcheance
				})
				return {
					...run,
					tachesTotal: taches.length,
					tachesDone: done,
					taches: sortedTaches,
				}
			}),
		)

		return enriched
	},
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
	args: {
		clientId: v.id("clients"),
		dossierId: v.optional(v.id("dossiers")),
		exercice: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client non trouvé")

		if (user.role !== "admin" && client.managerId !== user.id) {
			throw new Error("Non autorisé")
		}

		// Check no duplicate run for same client+exercice
		const existing = await ctx.db
			.query("runs")
			.withIndex("by_client", (q) => q.eq("clientId", args.clientId))
			.collect()
		if (existing.some((r) => r.exercice === args.exercice)) {
			throw new Error(`Un run existe déjà pour cet exercice (${args.exercice})`)
		}

		const now = Date.now()
		const runId = await ctx.db.insert("runs", {
			clientId: args.clientId,
			dossierId: args.dossierId,
			exercice: args.exercice,
			status: "a_venir",
			createdAt: now,
			updatedAt: now,
		})

		// Generate fiscal tasks: mindmap → fiscalRules → legacy fallback
		const mindmap = await ctx.db.query("fiscalMindmap").first()

		if (mindmap && mindmap.nodes.length > 0) {
			const tasks = traverseMindmap(
				mindmap.nodes as MindmapNode[],
				mindmap.edges as MindmapEdge[],
				client,
				args.exercice,
			)
			const taskNow = Date.now()
			await Promise.all(
				tasks.map((task, i) =>
					ctx.db.insert("taches", {
						runId,
						clientId: client._id,
						nom: task.nom,
						type: "fiscale",
						categorie: task.categorie,
						cerfa: task.cerfa,
						dateEcheance: task.dateEcheance,
						status: "a_venir",
						order: i + 1,
						createdAt: taskNow,
						updatedAt: taskNow,
					}),
				),
			)
		} else {
			const fiscalRules = await ctx.db
				.query("fiscalRules")
				.withIndex("by_active", (q) => q.eq("isActive", true))
				.collect()

			if (fiscalRules.length > 0) {
				const tasks = evaluateRules(client, args.exercice, fiscalRules)
				const taskNow = Date.now()
				await Promise.all(
					tasks.map((task, i) =>
						ctx.db.insert("taches", {
							runId,
							clientId: client._id,
							nom: task.nom,
							type: "fiscale",
							categorie: task.categorie,
							cerfa: task.cerfa,
							dateEcheance: task.dateEcheance,
							status: "a_venir",
							order: i + 1,
							createdAt: taskNow,
							updatedAt: taskNow,
						}),
					),
				)
			} else {
				await generateFiscalTasks(ctx, runId, client, args.exercice)
			}
		}

		return runId
	},
})

export const update = mutation({
	args: {
		id: v.id("runs"),
		status: v.optional(runStatusValidator),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role === "collaborateur") {
			throw new Error("Acces refuse : seuls les managers et admins peuvent modifier un run")
		}

		if (args.status) {
			const run = await ctx.db.get(args.id)
			if (!run) throw new Error("Run introuvable")

			const validTransitions: Record<string, string[]> = {
				a_venir: ["en_cours"],
				en_cours: ["en_attente", "termine"],
				en_attente: ["en_cours", "termine"],
				termine: [],
			}

			const allowed = validTransitions[run.status] ?? []
			if (!allowed.includes(args.status)) {
				throw new Error(`Transition de statut invalide : ${run.status} -> ${args.status}`)
			}
		}

		const { id, ...updates } = args
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("runs") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut supprimer un run")

		// Delete all tasks of this run
		const taches = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", args.id))
			.collect()
		for (const t of taches) {
			await ctx.db.delete(t._id)
		}

		await ctx.db.delete(args.id)
	},
})

export const regenerateTasks = mutation({
	args: { id: v.id("runs") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Seul un admin peut régénérer les tâches")

		const run = await ctx.db.get(args.id)
		if (!run) throw new Error("Run non trouvé")

		const client = await ctx.db.get(run.clientId)
		if (!client) throw new Error("Client non trouvé")

		// Delete existing fiscal tasks
		const taches = await ctx.db
			.query("taches")
			.withIndex("by_run", (q) => q.eq("runId", args.id))
			.collect()
		for (const t of taches) {
			if (t.type === "fiscale") {
				await ctx.db.delete(t._id)
			}
		}

		// Regenerate: mindmap → fiscalRules → legacy fallback
		const mindmap = await ctx.db.query("fiscalMindmap").first()

		if (mindmap && mindmap.nodes.length > 0) {
			const tasks = traverseMindmap(
				mindmap.nodes as MindmapNode[],
				mindmap.edges as MindmapEdge[],
				client,
				run.exercice,
			)
			const now = Date.now()
			await Promise.all(
				tasks.map((task, i) =>
					ctx.db.insert("taches", {
						runId: args.id,
						clientId: client._id,
						nom: task.nom,
						type: "fiscale",
						categorie: task.categorie,
						cerfa: task.cerfa,
						dateEcheance: task.dateEcheance,
						status: "a_venir",
						order: i + 1,
						createdAt: now,
						updatedAt: now,
					}),
				),
			)
		} else {
			const fiscalRules = await ctx.db
				.query("fiscalRules")
				.withIndex("by_active", (q) => q.eq("isActive", true))
				.collect()

			if (fiscalRules.length > 0) {
				const tasks = evaluateRules(client, run.exercice, fiscalRules)
				const now = Date.now()
				await Promise.all(
					tasks.map((task, i) =>
						ctx.db.insert("taches", {
							runId: args.id,
							clientId: client._id,
							nom: task.nom,
							type: "fiscale",
							categorie: task.categorie,
							cerfa: task.cerfa,
							dateEcheance: task.dateEcheance,
							status: "a_venir",
							order: i + 1,
							createdAt: now,
							updatedAt: now,
						}),
					),
				)
			} else {
				await generateFiscalTasks(ctx, args.id, client, run.exercice)
			}
		}
	},
})

// ─── MOTEUR FISCAL ────────────────────────────────────────────────────────────
// 21 conditions from the Airtable script, adapted to Convex schema values

async function generateFiscalTasks(
	ctx: MutationCtx,
	runId: Id<"runs">,
	client: Doc<"clients">,
	exercice: number,
) {
	const tasks: Array<{
		nom: string
		categorie: string
		cerfa?: string
		dateEcheance?: number
	}> = []

	const N = exercice
	const cloture = parseDateCloture(client.dateClotureComptable, N)
	const isCloture3112 = cloture.day === 31 && cloture.month === 12
	const clotureDate = dateCloture(cloture, N)

	// Date AGO (used by IS conditions) — cloture + 6 months
	const dateAGO = addMonthsAndDays(clotureDate, 6)

	// ─── Condition 1: IR ─────────────────────────────────────────────────────
	if (client.categorieFiscale?.startsWith("IR")) {
		tasks.push({
			nom: "Déclaration IR",
			categorie: "IR",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}

	// ─── Condition 2: BNC ────────────────────────────────────────────────────
	if (
		client.categorieFiscale === "IR-BNC" &&
		(client.regimeFiscal === "reel_normal" ||
			client.regimeFiscal === "reel_simplifie" ||
			client.regimeFiscal === "reel_complet")
	) {
		tasks.push({
			nom: "Déclaration de résultat 2035 + annexes 2035 A et B",
			categorie: "IR",
			cerfa: "2035",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}

	// ─── Condition 3: BIC ────────────────────────────────────────────────────
	if (client.categorieFiscale === "IR-BIC" && client.regimeFiscal === "reel_normal") {
		tasks.push({
			nom: "IR - Déclaration de résultat : liasse fiscale complète",
			categorie: "IR",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}
	if (client.categorieFiscale === "IR-BIC" && client.regimeFiscal === "reel_simplifie") {
		tasks.push({
			nom: "IR - Déclaration de résultat : liasse fiscale simplifiée",
			categorie: "IR",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}

	// ─── Condition 4: RF ─────────────────────────────────────────────────────
	if (
		client.categorieFiscale === "IR-RF" &&
		(client.regimeFiscal === "reel_simplifie" || client.regimeFiscal === "micro")
	) {
		tasks.push({
			nom: "Déclaration de résultat : liasse fiscale simplifiée (2072-S)",
			categorie: "IR",
			cerfa: "2072-S",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}
	if (client.categorieFiscale === "IR-RF" && client.regimeFiscal === "reel_complet") {
		tasks.push({
			nom: "Déclaration de résultat : liasse fiscale complète (2072-C)",
			categorie: "IR",
			cerfa: "2072-C",
			dateEcheance: isCloture3112 ? addMonthsAndDays(clotureDate, 4, 15) : fixedDate(15, 5, N + 1),
		})
	}

	// ─── Condition 5: DSFU / PAMC ────────────────────────────────────────────
	if (
		client.activite === "profession_liberale_medicale" ||
		client.activite === "autres_professions_liberales" ||
		client.activite === "commerciale_industrielle_artisanale"
	) {
		tasks.push({
			nom: "Déclaration DSFU (+PAMC)",
			categorie: "IR",
			dateEcheance: fixedDate(15, 5, N + 1),
		})
	}

	// ─── Condition 6: IS Déclarations de résultat ────────────────────────────
	if (client.categorieFiscale === "IS" && client.regimeFiscal === "reel_simplifie") {
		tasks.push({
			nom: "IS - Déclaration de résultat : liasse fiscale simplifiée",
			categorie: "IS",
			dateEcheance: isCloture3112 ? fixedDate(15, 5, N + 1) : addMonthsAndDays(clotureDate, 3, 15),
		})
	}
	if (client.categorieFiscale === "IS" && client.regimeFiscal === "reel_normal") {
		tasks.push({
			nom: "IS - Déclaration de résultat : liasse fiscale complète",
			categorie: "IS",
			dateEcheance: isCloture3112 ? fixedDate(15, 5, N + 1) : addMonthsAndDays(clotureDate, 3, 15),
		})
	}

	// ─── Condition 7: IS Solde ───────────────────────────────────────────────
	if (client.categorieFiscale === "IS") {
		tasks.push({
			nom: "Déclaration solde IS - Cerfa 2572",
			categorie: "IS",
			cerfa: "2572",
			dateEcheance: isCloture3112 ? fixedDate(15, 5, N + 1) : addMonthsAndDays(clotureDate, 4, 15),
		})
	}

	// ─── Condition 8: IS Approbation des comptes ─────────────────────────────
	if (client.categorieFiscale === "IS") {
		tasks.push({
			nom: "Approbation des comptes (AGO)",
			categorie: "IS",
			dateEcheance: dateAGO,
		})
	}

	// ─── Condition 9: IS Dépôt & Comptes annuels ────────────────────────────
	if (client.categorieFiscale === "IS") {
		const dateAfterAGO = addMonthsAndDays(new Date(dateAGO), 2)
		tasks.push(
			{
				nom: "Dépôt des comptes au greffe",
				categorie: "IS",
				dateEcheance: dateAfterAGO,
			},
			{
				nom: "Etablissement des comptes annuels",
				categorie: "IS",
				dateEcheance: dateAfterAGO,
			},
			{
				nom: "Entretien de présentation des comptes annuels",
				categorie: "IS",
				dateEcheance: dateAfterAGO,
			},
		)
	}

	// ─── Condition 10: IS Revenus capitaux mobiliers ─────────────────────────
	if (client.categorieFiscale === "IS") {
		tasks.push({
			nom: "Déclaration revenus capitaux mobiliers - Cerfa 2777",
			categorie: "IS",
			cerfa: "2777",
			dateEcheance: addDaysToTimestamp(dateAGO, 15),
		})
		tasks.push({
			nom: "Déclaration revenus de capitaux mobiliers - Cerfa IFU 2561",
			categorie: "IS",
			cerfa: "2561",
			dateEcheance: fixedDate(15, 2, N + 1),
		})
	}

	// ─── Condition 11: IS Acomptes ───────────────────────────────────────────
	if (client.categorieFiscale === "IS") {
		tasks.push({
			nom: "IS - Solde",
			categorie: "IS",
			dateEcheance: isCloture3112
				? addMonthsAndDays(clotureDate, 4, 15)
				: addMonthsAndDays(clotureDate, 3, 15),
		})

		if (!client.paiementISUnique) {
			// Determine acompte dates based on cloture period
			const cm = cloture.month
			const cd = cloture.day
			let acomptes: number[]

			if ((cm === 2 && cd >= 20) || cm === 3 || cm === 4 || (cm === 5 && cd <= 19)) {
				// 20 février – 19 mai
				acomptes = [
					fixedDate(15, 6, N - 1),
					fixedDate(15, 9, N - 1),
					fixedDate(15, 12, N - 1),
					fixedDate(15, 3, N),
				]
			} else if ((cm === 5 && cd >= 20) || cm === 6 || cm === 7 || (cm === 8 && cd <= 19)) {
				// 20 mai – 19 août
				acomptes = [
					fixedDate(15, 9, N - 1),
					fixedDate(15, 12, N - 1),
					fixedDate(15, 3, N),
					fixedDate(15, 6, N),
				]
			} else if ((cm === 8 && cd >= 20) || cm === 9 || cm === 10 || (cm === 11 && cd <= 19)) {
				// 20 août – 19 novembre
				acomptes = [
					fixedDate(15, 12, N - 1),
					fixedDate(15, 3, N),
					fixedDate(15, 6, N),
					fixedDate(15, 9, N),
				]
			} else {
				// 20 novembre – 19 février (year-end / default)
				acomptes = [
					fixedDate(15, 3, N),
					fixedDate(15, 6, N),
					fixedDate(15, 9, N),
					fixedDate(15, 12, N),
				]
			}

			for (let i = 0; i < 4; i++) {
				tasks.push({
					nom: `IS - Acompte_${i + 1}`,
					categorie: "IS",
					dateEcheance: acomptes[i],
				})
			}
		}
	}

	// ─── Condition 12: CVAE ──────────────────────────────────────────────────
	const caN1 = client.caN1 ?? 0
	if (caN1 > 152500) {
		tasks.push({
			nom: "Déclaration de valeur ajoutée (1330) + CVAE",
			categorie: "TAXES",
			cerfa: "1330",
			dateEcheance: fixedDate(15, 5, N + 1),
		})
	}
	if (caN1 > 500000) {
		tasks.push({
			nom: "CVAE - Formulaire 1329 - AC - SD - Solde",
			categorie: "TAXES",
			cerfa: "1329",
			dateEcheance: fixedDate(1, 5, N + 1),
		})
	}
	if (caN1 > 500000 && (client.montantCVAEN1 ?? 0) > 1500) {
		tasks.push({
			nom: "CVAE - Formulaire 1329 - AC - SD - Acompte_1",
			categorie: "TAXES",
			cerfa: "1329",
			dateEcheance: fixedDate(15, 6, N),
		})
		tasks.push({
			nom: "CVAE - Formulaire 1329 - AC - SD - Acompte_2",
			categorie: "TAXES",
			cerfa: "1329",
			dateEcheance: fixedDate(15, 9, N),
		})
	}

	// ─── Condition 13: CFE ───────────────────────────────────────────────────
	tasks.push({
		nom: "CFE - Solde",
		categorie: "TAXES",
		dateEcheance: fixedDate(15, 12, N),
	})
	tasks.push({
		nom: "CFE - Modification déclaration (1447 - M)",
		categorie: "TAXES",
		cerfa: "1447-M",
		dateEcheance: fixedDate(30, 4, N + 1),
	})
	if ((client.montantCFEN1 ?? 0) >= 3000) {
		tasks.push({
			nom: "CFE - Acompte",
			categorie: "TAXES",
			dateEcheance: fixedDate(15, 6, N),
		})
	}

	// ─── Condition 14: DAS2 ──────────────────────────────────────────────────
	{
		let das2Date: number
		if (client.categorieFiscale === "IS" && isCloture3112) {
			das2Date = fixedDate(1, 5, N + 1)
		} else if (client.categorieFiscale === "IS" && !isCloture3112) {
			das2Date = addMonthsAndDays(clotureDate, 3)
		} else {
			das2Date = fixedDate(1, 5, N + 1)
		}
		tasks.push({
			nom: "DAS2 - Formulaire 2460 - 2 - SD",
			categorie: "TAXES",
			cerfa: "2460",
			dateEcheance: das2Date,
		})
	}

	// ─── Condition 15: TS (Taxe sur les Salaires) ────────────────────────────
	if (
		(client.nombreEmployes ?? 0) >= 1 &&
		(client.regimeTVA === "exoneree" || client.regimeTVA === "franchise_en_base")
	) {
		const montantTS = client.montantTSN1 ?? 0

		if (montantTS <= 4000) {
			tasks.push({
				nom: "TS - Formulaire 2502",
				categorie: "TAXES",
				cerfa: "2502",
				dateEcheance: fixedDate(15, 1, N + 1),
			})
		} else if (montantTS > 4000 && montantTS < 10000) {
			tasks.push(
				{
					nom: "TS - Formulaire 2501 - SD - 1",
					categorie: "TAXES",
					cerfa: "2501",
					dateEcheance: fixedDate(15, 4, N),
				},
				{
					nom: "TS - Formulaire 2501 - SD - 2",
					categorie: "TAXES",
					cerfa: "2501",
					dateEcheance: fixedDate(15, 7, N),
				},
				{
					nom: "TS - Formulaire 2501 - SD - 3",
					categorie: "TAXES",
					cerfa: "2501",
					dateEcheance: fixedDate(15, 10, N),
				},
				{
					nom: "TS - Régularisation - 2502 - SD",
					categorie: "TAXES",
					cerfa: "2502",
					dateEcheance: fixedDate(31, 1, N + 1),
				},
			)
		} else if (montantTS >= 10000) {
			// Monthly TS: Feb to Dec (11 tasks)
			const monthNames = [
				"Février",
				"Mars",
				"Avril",
				"Mai",
				"Juin",
				"Juillet",
				"Août",
				"Septembre",
				"Octobre",
				"Novembre",
				"Décembre",
			]
			for (let m = 2; m <= 12; m++) {
				tasks.push({
					nom: `TS - Formulaire 3310 - A - SD - ${monthNames[m - 2]}`,
					categorie: "TAXES",
					cerfa: "3310-A",
					dateEcheance: fixedDate(15, m + 1 > 12 ? 1 : m + 1, m + 1 > 12 ? N + 1 : N),
				})
			}
			tasks.push({
				nom: "TS - Régularisation - 2502 - SD",
				categorie: "TAXES",
				cerfa: "2502",
				dateEcheance: fixedDate(31, 1, N + 1),
			})
		}
	}

	// ─── Condition 16: Taxe foncière ─────────────────────────────────────────
	if (client.proprietaire) {
		tasks.push({
			nom: "Taxe foncière",
			categorie: "TAXES",
			dateEcheance: fixedDate(30, 9, N),
		})
	}

	// ─── Condition 17: TASCOM ────────────────────────────────────────────────
	if (client.secteur === "Commerce & Distribution" && (client.surfaceCommerciale ?? 0) >= 400) {
		tasks.push({
			nom: "TASCOM - Formulaire 3350 - SD",
			categorie: "TAXES",
			cerfa: "3350",
			dateEcheance: fixedDate(15, 6, N),
		})
	}

	// ─── Condition 18: DECLOYER ──────────────────────────────────────────────
	if (client.localPro) {
		tasks.push({
			nom: "DECLOYER",
			categorie: "TAXES",
			dateEcheance: isCloture3112
				? fixedDate(15, 5, N + 1)
				: fixedDate(
						15,
						cloture.month + 3 > 12 ? cloture.month + 3 - 12 : cloture.month + 3,
						cloture.month + 3 > 12 ? N + 1 : N,
					),
		})
	}

	// ─── Condition 19: TSB (Taxe sur les Bureaux) ────────────────────────────
	const tsbDepts = ["75", "77", "78", "91", "92", "93", "94", "95", "06", "13", "83"]
	if (client.departement && tsbDepts.includes(client.departement)) {
		tasks.push({
			nom: "Taxe sur les bureaux - formulaire 6705 - B",
			categorie: "TAXES",
			cerfa: "6705-B",
			dateEcheance: fixedDate(1, 3, N),
		})
	}

	// ─── Condition 20: TVE ───────────────────────────────────────────────────
	if (
		client.regimeTVA === "franchise_en_base" ||
		client.regimeTVA === "exoneree" ||
		client.regimeTVA === "reel_normal"
	) {
		tasks.push({
			nom: "TVE - Formulaire 3310 - A - SD",
			categorie: "TAXES",
			cerfa: "3310-A",
			dateEcheance: fixedDate(31, 1, N + 1),
		})
	}
	if (client.regimeTVA === "rsi") {
		tasks.push({
			nom: "TVE - Formulaire 3517",
			categorie: "TAXES",
			cerfa: "3517",
			dateEcheance: isCloture3112 ? fixedDate(1, 5, N + 1) : addMonthsAndDays(clotureDate, 3),
		})
	}

	// ─── Condition 21: TVA ───────────────────────────────────────────────────
	if (client.regimeTVA !== "exoneree" && client.regimeTVA !== "franchise_en_base") {
		const jourTVA = client.jourTVA ?? 0

		if (client.regimeTVA === "reel_normal" && client.frequenceTVA === "trimestrielle") {
			const trimestres = [
				{ label: "T1", endMonth: 3, endDay: 31 },
				{ label: "T2", endMonth: 6, endDay: 30 },
				{ label: "T3", endMonth: 9, endDay: 30 },
				{ label: "T4", endMonth: 12, endDay: 31 },
			]
			for (const t of trimestres) {
				const base = fixedDate(t.endDay, t.endMonth, N)
				tasks.push({
					nom: `TVA réel normal - déclaration ${t.label}`,
					categorie: "TVA",
					dateEcheance: addDaysToTimestamp(base, jourTVA),
				})
			}
		}

		if (client.regimeTVA === "reel_normal" && client.frequenceTVA === "mensuelle") {
			const moisNoms = [
				"Janvier",
				"Février",
				"Mars",
				"Avril",
				"Mai",
				"Juin",
				"Juillet",
				"Août",
				"Septembre",
				"Octobre",
				"Novembre",
				"Décembre",
			]
			for (let m = 1; m <= 12; m++) {
				const base = endOfMonth(m, N)
				tasks.push({
					nom: `TVA réel normal - déclaration ${moisNoms[m - 1]}`,
					categorie: "TVA",
					dateEcheance: addDaysToTimestamp(base, jourTVA),
				})
			}
		}

		if (client.regimeTVA === "rsi") {
			tasks.push({
				nom: "TVA réel simplifié - déclaration annuelle",
				categorie: "TVA",
				dateEcheance: addMonthsAndDays(clotureDate, 3),
			})
			tasks.push({
				nom: "TVA réel simplifié - Acompte_1",
				categorie: "TVA",
				dateEcheance: fixedDate(31, 7, N),
			})
			tasks.push({
				nom: "TVA réel simplifié - Acompte_2",
				categorie: "TVA",
				dateEcheance: fixedDate(31, 12, N),
			})
		}
	}

	// ─── Insert all tasks (parallel) ─────────────────────────────────────────
	const now = Date.now()
	await Promise.all(
		tasks.map((task, i) =>
			ctx.db.insert("taches", {
				runId,
				clientId: client._id,
				nom: task.nom,
				type: "fiscale",
				categorie: task.categorie,
				cerfa: task.cerfa,
				dateEcheance: task.dateEcheance,
				status: "a_venir",
				order: i + 1,
				createdAt: now,
				updatedAt: now,
			}),
		),
	)

	return tasks.length
}
