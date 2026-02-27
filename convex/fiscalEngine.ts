import type { Doc } from "./_generated/dataModel"

// ─── Types ───────────────────────────────────────────────────────────────────

type FiscalRule = Doc<"fiscalRules">
type Client = Doc<"clients">

export interface TaskToCreate {
	nom: string
	categorie?: string
	cerfa?: string
	dateEcheance?: number
}

interface ClotureInfo {
	day: number
	month: number
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function parseDateCloture(dateStr: string | undefined): ClotureInfo {
	if (!dateStr) return { day: 31, month: 12 }
	const parts = dateStr.split("/")
	if (parts.length !== 2) return { day: 31, month: 12 }
	return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10) }
}

function dateCloture(cloture: ClotureInfo, exercice: number): Date {
	return new Date(exercice, cloture.month - 1, cloture.day)
}

function fixedDate(day: number, month: number, year: number): number {
	return new Date(year, month - 1, day).getTime()
}

function addMonthsAndDays(date: Date, months: number, days = 0): number {
	const d = new Date(date)
	d.setMonth(d.getMonth() + months)
	if (days > 0) d.setDate(d.getDate() + days)
	return d.getTime()
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

function endOfQuarter(quarter: number, year: number): number {
	const endMonth = quarter * 3
	return endOfMonth(endMonth, year)
}

// ─── Condition evaluator ─────────────────────────────────────────────────────

function getClientField(client: Client, champ: string): unknown {
	return (client as Record<string, unknown>)[champ]
}

export function evaluateCondition(
	client: Client,
	condition: { champ: string; operateur: string; valeur?: unknown },
): boolean {
	const fieldValue = getClientField(client, condition.champ)
	const { operateur, valeur } = condition

	switch (operateur) {
		case "equals":
			return fieldValue === valeur
		case "not_equals":
			return fieldValue !== valeur
		case "in":
			return Array.isArray(valeur) && valeur.includes(fieldValue)
		case "not_in":
			return Array.isArray(valeur) && !valeur.includes(fieldValue)
		case "gt":
			return typeof fieldValue === "number" && typeof valeur === "number" && fieldValue > valeur
		case "gte":
			return typeof fieldValue === "number" && typeof valeur === "number" && fieldValue >= valeur
		case "lt":
			return typeof fieldValue === "number" && typeof valeur === "number" && fieldValue < valeur
		case "lte":
			return typeof fieldValue === "number" && typeof valeur === "number" && fieldValue <= valeur
		case "is_true":
			return fieldValue === true
		case "is_false":
			return fieldValue === false
		case "is_set":
			return fieldValue !== undefined && fieldValue !== null
		case "is_not_set":
			return fieldValue === undefined || fieldValue === null
		case "starts_with":
			return (
				typeof fieldValue === "string" &&
				typeof valeur === "string" &&
				fieldValue.startsWith(valeur)
			)
		default:
			return false
	}
}

// ─── Date formula calculator ─────────────────────────────────────────────────

const MOIS_NOMS = [
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

export function calculateDate(
	formule: { type: string; params: Record<string, unknown> },
	exercice: number,
	client: Client,
): number | undefined {
	const params = formule.params
	const cloture = parseDateCloture(client.dateClotureComptable)
	const clotureDate = dateCloture(cloture, exercice)
	const isCloture3112 = cloture.day === 31 && cloture.month === 12

	switch (formule.type) {
		case "fixed": {
			const baseMois = (params.mois as number) + ((params.moisOffset as number) ?? 0)
			const yearAdd = baseMois > 12 ? 1 : baseMois < 1 ? -1 : 0
			const adjustedMois = baseMois > 12 ? baseMois - 12 : baseMois < 1 ? baseMois + 12 : baseMois
			const baseYear = (params.anneeOffset as number) === 1 ? exercice + 1 : exercice
			return fixedDate(params.jour as number, adjustedMois, baseYear + yearAdd)
		}

		case "relative_to_cloture":
			return addMonthsAndDays(
				clotureDate,
				(params.moisOffset as number) ?? 0,
				(params.joursOffset as number) ?? 0,
			)

		case "cloture_conditional":
			if (isCloture3112) {
				const da = params.dateA as { jour: number; mois: number; anneeOffset?: number }
				return fixedDate(da.jour, da.mois, da.anneeOffset === 1 ? exercice + 1 : exercice)
			}
			if (params.dateB) {
				const db = params.dateB as {
					type?: string
					moisOffset?: number
					joursOffset?: number
					jour?: number
					mois?: number
					anneeOffset?: number
				}
				if (db.type === "relative_to_cloture") {
					return addMonthsAndDays(clotureDate, db.moisOffset ?? 0, db.joursOffset ?? 0)
				}
				return fixedDate(
					db.jour as number,
					db.mois as number,
					db.anneeOffset === 1 ? exercice + 1 : exercice,
				)
			}
			return addMonthsAndDays(
				clotureDate,
				(params.moisOffset as number) ?? 3,
				(params.joursOffset as number) ?? 0,
			)

		case "end_of_month_plus_offset": {
			const mois = params.mois as number
			const jourTVA = (client.jourTVA as number | undefined) ?? 0
			const offset = params.offsetJours !== undefined ? (params.offsetJours as number) : jourTVA
			const base = endOfMonth(mois, exercice)
			return offset > 0 ? addDaysToTimestamp(base, offset) : base
		}

		case "end_of_quarter_plus_offset": {
			const trimestre = params.trimestre as number
			const jourTVA = (client.jourTVA as number | undefined) ?? 0
			const offset = params.offsetJours !== undefined ? (params.offsetJours as number) : jourTVA
			const base = endOfQuarter(trimestre, exercice)
			return offset > 0 ? addDaysToTimestamp(base, offset) : base
		}

		case "relative_to_ago": {
			const dateAGO = addMonthsAndDays(clotureDate, 6)
			const agoDate = new Date(dateAGO)
			return addMonthsAndDays(
				agoDate,
				(params.moisOffset as number) ?? 0,
				(params.joursOffset as number) ?? 0,
			)
		}

		case "is_acompte_cloture_period": {
			const acompteNum = params.acompteNum as number
			if (acompteNum < 1 || acompteNum > 4) return undefined

			const m = cloture.month
			const d = cloture.day

			// 4 cloture periods → different acompte date schedules
			// [jour, mois, yearOffset from exercice]
			const periods: [number, number, number][][] = [
				// Period 1: 20/02 – 19/05
				[
					[15, 6, -1],
					[15, 9, -1],
					[15, 12, -1],
					[15, 3, 0],
				],
				// Period 2: 20/05 – 19/08
				[
					[15, 9, -1],
					[15, 12, -1],
					[15, 3, 0],
					[15, 6, 0],
				],
				// Period 3: 20/08 – 19/11
				[
					[15, 12, -1],
					[15, 3, 0],
					[15, 6, 0],
					[15, 9, 0],
				],
				// Period 4: 20/11 – 19/02 (année civile, 31/12)
				[
					[15, 3, 0],
					[15, 6, 0],
					[15, 9, 0],
					[15, 12, 0],
				],
			]

			let period: number
			if ((m === 2 && d >= 20) || (m > 2 && m < 5) || (m === 5 && d <= 19)) {
				period = 0
			} else if ((m === 5 && d >= 20) || (m > 5 && m < 8) || (m === 8 && d <= 19)) {
				period = 1
			} else if ((m === 8 && d >= 20) || (m > 8 && m < 11) || (m === 11 && d <= 19)) {
				period = 2
			} else {
				period = 3
			}

			const [jour, mois, yearOffset] = periods[period][acompteNum - 1]
			return fixedDate(jour, mois, exercice + yearOffset)
		}

		default:
			return undefined
	}
}

// ─── Calculate date for a specific month/quarter instance ────────────────────

function calculateRepeatDate(
	formule: { type: string; params: Record<string, unknown> },
	exercice: number,
	client: Client,
	instanceMonth?: number,
	instanceQuarter?: number,
): number | undefined {
	const params = formule.params
	const jourTVA = (client.jourTVA as number) ?? 0

	if (formule.type === "end_of_month_plus_offset" && instanceMonth !== undefined) {
		const base = endOfMonth(instanceMonth, exercice)
		const offset = (params.offsetJours as number) ?? jourTVA
		return offset > 0 ? addDaysToTimestamp(base, offset) : base
	}

	if (formule.type === "end_of_quarter_plus_offset" && instanceQuarter !== undefined) {
		const endMonth = instanceQuarter * 3
		const base = endOfMonth(endMonth, exercice)
		const offset = (params.offsetJours as number) ?? jourTVA
		return offset > 0 ? addDaysToTimestamp(base, offset) : base
	}

	if (formule.type === "fixed" && instanceMonth !== undefined) {
		return fixedDate(
			params.jour as number,
			instanceMonth + 1 > 12 ? 1 : instanceMonth + 1,
			instanceMonth + 1 > 12 ? exercice + 1 : exercice,
		)
	}

	return calculateDate(formule, exercice, client)
}

// ─── Task expander ───────────────────────────────────────────────────────────

function expandTasks(
	branchTaches: Array<{
		nom: string
		categorie?: string
		cerfa?: string
		dateFormule: { type: string; params: Record<string, unknown> }
		repeat?: { frequence: string; moisExclus?: number[] }
	}>,
	exercice: number,
	client: Client,
): TaskToCreate[] {
	const result: TaskToCreate[] = []

	for (const tache of branchTaches) {
		if (tache.repeat) {
			const { frequence, moisExclus = [] } = tache.repeat

			if (frequence === "mensuelle") {
				for (let m = 1; m <= 12; m++) {
					if (moisExclus.includes(m)) continue
					const nom = tache.nom.replace("{mois}", MOIS_NOMS[m - 1]).replace("{m}", String(m))
					const dateEcheance = calculateRepeatDate(tache.dateFormule, exercice, client, m)
					result.push({
						nom,
						categorie: tache.categorie,
						cerfa: tache.cerfa,
						dateEcheance,
					})
				}
			} else if (frequence === "trimestrielle") {
				const trimestreLabels = ["T1", "T2", "T3", "T4"]
				for (let q = 1; q <= 4; q++) {
					const qMonths = [q * 3 - 2, q * 3 - 1, q * 3]
					if (qMonths.some((m) => moisExclus.includes(m))) continue
					const nom = tache.nom
						.replace("{trimestre}", trimestreLabels[q - 1])
						.replace("{q}", String(q))
					const dateEcheance = calculateRepeatDate(
						tache.dateFormule,
						exercice,
						client,
						undefined,
						q,
					)
					result.push({
						nom,
						categorie: tache.categorie,
						cerfa: tache.cerfa,
						dateEcheance,
					})
				}
			}
		} else {
			const dateEcheance = calculateDate(tache.dateFormule, exercice, client)
			result.push({
				nom: tache.nom,
				categorie: tache.categorie,
				cerfa: tache.cerfa,
				dateEcheance,
			})
		}
	}

	return result
}

// ─── Main evaluator ──────────────────────────────────────────────────────────

export function evaluateRules(
	client: Client,
	exercice: number,
	rules: FiscalRule[],
): TaskToCreate[] {
	const allTasks: TaskToCreate[] = []
	const sortedRules = [...rules].sort((a, b) => a.ordre - b.ordre)

	for (const rule of sortedRules) {
		if (!rule.isActive) continue

		// Evaluate root conditions (AND)
		const rootMatch = rule.conditions.every((cond) => evaluateCondition(client, cond))
		if (!rootMatch) continue

		if (rule.branches.length === 0) continue

		// If only 1 branch with no conditions, it's a default branch
		if (rule.branches.length === 1 && rule.branches[0].conditions.length === 0) {
			const tasks = expandTasks(rule.branches[0].taches, exercice, client)
			allTasks.push(...tasks)
			continue
		}

		// Evaluate branches
		for (const branch of rule.branches) {
			const branchMatch =
				branch.conditions.length === 0 ||
				branch.conditions.every((cond) => evaluateCondition(client, cond))
			if (branchMatch) {
				const tasks = expandTasks(branch.taches, exercice, client)
				allTasks.push(...tasks)
			}
		}
	}

	return allTasks
}
