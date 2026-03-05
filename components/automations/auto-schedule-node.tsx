"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { CalendarClock, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const FREQUENCE_LABELS: Record<string, string> = {
	quotidien: "Quotidien",
	hebdomadaire: "Hebdomadaire",
	mensuel: "Mensuel",
	trimestriel: "Trimestriel",
	annuel: "Annuel",
}

const DATE_REF_LABELS: Record<string, string> = {
	dateClotureComptable: "Clôture comptable",
	dateEntree: "Date d'entrée",
	jourTVA: "Jour TVA",
	datePaiementDividendes: "Dividendes",
}

export type ScheduleNodeData = {
	planificationType: "frequence" | "date_relative"
	frequence?: string
	jourSemaine?: number
	jourMois?: number
	dateReference?: string
	joursDecalage?: number
}

export function AutoScheduleNode({ data, selected }: NodeProps) {
	const d = data as ScheduleNodeData

	let planifLabel = ""
	if (d.planificationType === "frequence") {
		planifLabel = FREQUENCE_LABELS[d.frequence ?? ""] ?? d.frequence ?? "—"
	} else {
		const ref = DATE_REF_LABELS[d.dateReference ?? ""] ?? d.dateReference ?? "—"
		const decalage = d.joursDecalage ?? 0
		const sign = decalage >= 0 ? "+" : ""
		planifLabel = `${sign}${decalage}j / ${ref}`
	}

	return (
		<div
			className={`rounded-lg border-2 px-4 py-3 shadow-sm min-w-[220px] max-w-[300px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : "border-sky-400 hover:shadow-md"
			}`}
			style={{ backgroundColor: "#f0f9ff" }}
		>
			<Handle type="target" position={Position.Top} className="!bg-sky-400 !w-2.5 !h-2.5" />
			<div className="flex items-center gap-2 mb-1.5">
				{d.planificationType === "frequence" ? (
					<Clock className="h-4 w-4 text-sky-600" />
				) : (
					<CalendarClock className="h-4 w-4 text-sky-600" />
				)}
				<span className="text-xs font-bold uppercase tracking-wide text-sky-700">
					Planification
				</span>
				<Badge variant="outline" className="text-[9px] ml-auto border-sky-300 text-sky-600">
					{d.planificationType === "frequence" ? "Fréquence" : "Date relative"}
				</Badge>
			</div>
			<p className="text-[11px] text-muted-foreground leading-tight">{planifLabel}</p>
			<Handle type="source" position={Position.Bottom} className="!bg-sky-400 !w-2.5 !h-2.5" />
		</div>
	)
}
