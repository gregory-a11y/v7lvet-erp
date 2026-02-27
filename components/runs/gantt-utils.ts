export type ZoomLevel = "semaine" | "mois" | "trimestre" | "annee"

export interface WeekColumn {
	weekLabel: string
	monthLabel: string
	monthKey: string
	startDate: Date
	endDate: Date
}

export interface MonthGroup {
	monthLabel: string
	monthKey: string
	colSpan: number
}

export interface DayColumn {
	label: string
	date: Date
}

export interface MonthColumn {
	label: string
	startDate: Date
	endDate: Date
}

export interface TimelineConfig {
	startDate: Date
	endDate: Date
	totalMs: number
	type: "weeks" | "days" | "months"
	weekColumns?: WeekColumn[]
	monthGroups?: MonthGroup[]
	dayColumns?: DayColumn[]
	monthColumns?: MonthColumn[]
}

const MONTH_SHORT = [
	"janv.",
	"févr.",
	"mars",
	"avr.",
	"mai",
	"juin",
	"juil.",
	"août",
	"sept.",
	"oct.",
	"nov.",
	"déc.",
]
const MONTH_LABELS = [
	"Jan",
	"Fév",
	"Mar",
	"Avr",
	"Mai",
	"Juin",
	"Juil",
	"Août",
	"Sep",
	"Oct",
	"Nov",
	"Déc",
]
const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

function getMondayOfWeek(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay() || 7
	d.setDate(d.getDate() - (day - 1))
	d.setHours(0, 0, 0, 0)
	return d
}

function generateWeekColumns(
	rangeStart: Date,
	rangeEnd: Date,
): { columns: WeekColumn[]; groups: MonthGroup[] } {
	const columns: WeekColumn[] = []
	const current = getMondayOfWeek(rangeStart)
	const monthWeekCount = new Map<string, number>()

	while (current <= rangeEnd) {
		const thursday = new Date(current)
		thursday.setDate(current.getDate() + 3)
		const month = thursday.getMonth()
		const year = thursday.getFullYear()
		const monthKey = `${year}-${String(month).padStart(2, "0")}`

		const count = (monthWeekCount.get(monthKey) || 0) + 1
		monthWeekCount.set(monthKey, count)

		const sunday = new Date(current)
		sunday.setDate(current.getDate() + 6)
		sunday.setHours(23, 59, 59, 999)

		columns.push({
			weekLabel: `S${count}`,
			monthLabel: MONTH_SHORT[month],
			monthKey,
			startDate: new Date(current),
			endDate: sunday,
		})

		current.setDate(current.getDate() + 7)
	}

	const groups: MonthGroup[] = []
	let currentKey = ""
	for (const col of columns) {
		if (col.monthKey !== currentKey) {
			groups.push({ monthLabel: col.monthLabel, monthKey: col.monthKey, colSpan: 1 })
			currentKey = col.monthKey
		} else {
			groups[groups.length - 1].colSpan++
		}
	}

	return { columns, groups }
}

export function buildTimelineConfig(zoom: ZoomLevel, exercice: number): TimelineConfig {
	const now = new Date()

	if (zoom === "mois") {
		const rangeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
		const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999)
		const { columns, groups } = generateWeekColumns(rangeStart, rangeEnd)
		const start = columns[0]?.startDate ?? rangeStart
		const end = columns[columns.length - 1]?.endDate ?? rangeEnd
		return {
			startDate: start,
			endDate: end,
			totalMs: end.getTime() - start.getTime(),
			type: "weeks",
			weekColumns: columns,
			monthGroups: groups,
		}
	}

	if (zoom === "trimestre") {
		const rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
		const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999)
		const { columns, groups } = generateWeekColumns(rangeStart, rangeEnd)
		const start = columns[0]?.startDate ?? rangeStart
		const end = columns[columns.length - 1]?.endDate ?? rangeEnd
		return {
			startDate: start,
			endDate: end,
			totalMs: end.getTime() - start.getTime(),
			type: "weeks",
			weekColumns: columns,
			monthGroups: groups,
		}
	}

	if (zoom === "semaine") {
		const rangeStart = new Date(now)
		rangeStart.setDate(now.getDate() - 10)
		rangeStart.setHours(0, 0, 0, 0)
		const rangeEnd = new Date(now)
		rangeEnd.setDate(now.getDate() + 10)
		rangeEnd.setHours(23, 59, 59, 999)

		const dayColumns: DayColumn[] = []
		const current = new Date(rangeStart)
		while (current <= rangeEnd) {
			dayColumns.push({
				label: `${DAY_SHORT[current.getDay()]} ${current.getDate()}`,
				date: new Date(current),
			})
			current.setDate(current.getDate() + 1)
		}

		return {
			startDate: rangeStart,
			endDate: rangeEnd,
			totalMs: rangeEnd.getTime() - rangeStart.getTime(),
			type: "days",
			dayColumns,
		}
	}

	// annee
	const startDate = new Date(exercice, 0, 1)
	const endDate = new Date(exercice, 11, 31, 23, 59, 59, 999)
	const monthColumns: MonthColumn[] = Array.from({ length: 12 }, (_, i) => ({
		label: MONTH_LABELS[i],
		startDate: new Date(exercice, i, 1),
		endDate: new Date(exercice, i + 1, 0, 23, 59, 59, 999),
	}))

	return {
		startDate,
		endDate,
		totalMs: endDate.getTime() - startDate.getTime(),
		type: "months",
		monthColumns,
	}
}

export function getXPosition(timestamp: number, config: TimelineConfig): number {
	const pos = (timestamp - config.startDate.getTime()) / config.totalMs
	return Math.max(0, Math.min(1, pos))
}

export function getTodayPosition(config: TimelineConfig): number {
	return getXPosition(Date.now(), config)
}

export function getColumnCount(config: TimelineConfig): number {
	if (config.weekColumns) return config.weekColumns.length
	if (config.dayColumns) return config.dayColumns.length
	if (config.monthColumns) return config.monthColumns.length
	return 0
}

export function isOverdue(dateEcheance: number, status: string): boolean {
	return dateEcheance < Date.now() && status !== "termine"
}

/**
 * Couleurs cohérentes avec le métier :
 * - gray   = à venir (neutre, rien d'alarmant, pas encore commencé)
 * - emerald = en cours (on y travaille activement)
 * - amber  = en attente (bloqué / en attente d'info)
 * - green  = terminé (fait !)
 * - red    = en retard (deadline passée + pas terminé)
 */
export type StatusColor = "green" | "red" | "amber" | "emerald" | "gray"

export function getStatusColor(dateEcheance: number | undefined, status: string): StatusColor {
	if (status === "termine") return "green"
	if (dateEcheance && dateEcheance < Date.now()) return "red"
	if (status === "en_attente") return "amber"
	if (status === "en_cours") return "emerald"
	return "gray"
}
