"use client"

import type { TimelineConfig } from "./gantt-utils"

interface GanttHeaderProps {
	config: TimelineConfig
}

export function GanttHeader({ config }: GanttHeaderProps) {
	// Week-based header (mois / trimestre zoom)
	if (config.type === "weeks" && config.weekColumns && config.monthGroups) {
		return (
			<div>
				{/* Week labels row */}
				<div className="flex">
					{config.weekColumns.map((col, i) => (
						<div
							key={i}
							className="flex-1 min-w-[60px] text-center text-xs font-medium text-foreground py-1.5 border-r border-gray-100 last:border-r-0"
						>
							{col.weekLabel}
						</div>
					))}
				</div>
				{/* Month labels row */}
				<div className="flex border-t border-gray-100">
					{config.monthGroups.map((group, i) => (
						<div
							key={i}
							className="text-center text-[11px] text-muted-foreground py-1 border-r border-gray-100 last:border-r-0"
							style={{ flex: group.colSpan }}
						>
							{group.monthLabel}
						</div>
					))}
				</div>
			</div>
		)
	}

	// Day-based header (semaine zoom)
	if (config.type === "days" && config.dayColumns) {
		return (
			<div className="flex">
				{config.dayColumns.map((col, i) => (
					<div
						key={i}
						className="flex-1 min-w-[60px] text-center text-xs font-medium text-muted-foreground py-2 border-r border-gray-100 last:border-r-0"
					>
						{col.label}
					</div>
				))}
			</div>
		)
	}

	// Month-based header (annee zoom)
	if (config.type === "months" && config.monthColumns) {
		return (
			<div className="flex">
				{config.monthColumns.map((col, i) => (
					<div
						key={i}
						className="flex-1 min-w-[60px] text-center text-xs font-medium text-muted-foreground py-2 border-r border-gray-100 last:border-r-0"
					>
						{col.label}
					</div>
				))}
			</div>
		)
	}

	return null
}
