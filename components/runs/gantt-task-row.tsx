"use client"

import { CheckCircle2, Circle, Clock, Loader2, XCircle } from "lucide-react"
import {
	getColumnCount,
	getStatusColor,
	getXPosition,
	isOverdue,
	type StatusColor,
	type TimelineConfig,
} from "./gantt-utils"

interface GanttTaskRowProps {
	nom: string
	cerfa?: string
	clientName: string
	dateEcheance: number
	status: string
	config: TimelineConfig
	isEven: boolean
}

const STATUS_BAR_COLORS: Record<StatusColor, string> = {
	green: "bg-green-500",
	red: "bg-red-500",
	amber: "bg-amber-400",
	emerald: "bg-[#2E6965]",
	gray: "bg-gray-300",
}

const DOT_COLORS: Record<StatusColor, string> = {
	green: "bg-green-500",
	red: "bg-red-500",
	amber: "bg-amber-400",
	emerald: "bg-[#2E6965]",
	gray: "bg-gray-400",
}

function StatusIcon({ status, color }: { status: string; color: StatusColor }) {
	if (status === "termine") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
	if (color === "red") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
	if (status === "en_cours") return <Loader2 className="h-4 w-4 text-[#2E6965] shrink-0" />
	if (status === "en_attente") return <Clock className="h-4 w-4 text-amber-500 shrink-0" />
	return <Circle className="h-4 w-4 text-gray-400 shrink-0" />
}

export function GanttTaskRow({
	nom,
	cerfa,
	clientName,
	dateEcheance,
	status,
	config,
	isEven,
}: GanttTaskRowProps) {
	const x = getXPosition(dateEcheance, config)
	const overdue = isOverdue(dateEcheance, status)
	const color = getStatusColor(dateEcheance, status)
	const colCount = getColumnCount(config)

	const formattedDate = new Date(dateEcheance).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
	})

	// Build the task label: "Nom (DD/MM)" + optional cerfa
	const taskLabel = cerfa ? `${nom} - Cerfa ${cerfa}` : nom

	return (
		<div
			className={`relative border-b border-gray-100 ${isEven ? "bg-white" : "bg-gray-50/30"}`}
			style={{ height: "52px" }}
		>
			{/* Status bar on the left edge */}
			<div
				className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full ${STATUS_BAR_COLORS[color]}`}
			/>

			{/* Grid column lines */}
			<div className="absolute inset-0 flex pointer-events-none">
				{Array.from({ length: colCount }).map((_, i) => (
					<div key={i} className="flex-1 border-r border-gray-50 last:border-r-0" />
				))}
			</div>

			{/* Task label positioned at deadline */}
			<div
				className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2 whitespace-nowrap z-10 pl-1"
				style={{ left: `${x * 100}%` }}
			>
				<StatusIcon status={status} color={color} />

				{/* Task name with inline date */}
				<span
					className={`text-[13px] font-medium leading-tight ${overdue ? "text-red-600" : "text-foreground"}`}
				>
					{taskLabel}
					<span className="text-muted-foreground font-normal"> ({formattedDate})</span>
				</span>

				{/* Client name */}
				<span className="text-xs text-muted-foreground/70 uppercase tracking-wide">
					{clientName}
				</span>

				{/* Colored dot */}
				<div className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT_COLORS[color]}`} />

				{/* Overdue badge */}
				{overdue && (
					<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[11px]">
						<span className="text-red-600 font-semibold tracking-wide">RETARD</span>
					</span>
				)}
			</div>
		</div>
	)
}
