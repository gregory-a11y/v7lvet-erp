"use client"

import { useQuery } from "convex/react"
import { Calendar } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import type { RunsFilters } from "@/components/runs/runs-filters"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { GanttHeader } from "./gantt-header"
import { GanttTaskRow } from "./gantt-task-row"
import { GanttTodayLine } from "./gantt-today-line"
import {
	buildTimelineConfig,
	getColumnCount,
	getTodayPosition,
	type ZoomLevel,
} from "./gantt-utils"

interface GanttViewProps {
	filters: RunsFilters
	zoom: ZoomLevel
	onZoomChange: (z: ZoomLevel) => void
}

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
	{ value: "semaine", label: "Semaine" },
	{ value: "mois", label: "Mois" },
	{ value: "trimestre", label: "Trimestre" },
	{ value: "annee", label: "Année" },
]

export function GanttView({ filters, zoom, onZoomChange }: GanttViewProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	const exercice =
		filters.exercice && filters.exercice !== "all"
			? parseInt(filters.exercice, 10)
			: new Date().getFullYear()

	const config = useMemo(() => buildTimelineConfig(zoom, exercice), [zoom, exercice])

	const taches = useQuery(api.taches.listForGanttEnriched, {
		startDate: config.startDate.getTime(),
		endDate: config.endDate.getTime(),
		clientId:
			filters.clientId && filters.clientId !== "all"
				? (filters.clientId as Id<"clients">)
				: undefined,
		categorie: filters.categorie && filters.categorie !== "all" ? filters.categorie : undefined,
		status: filters.status && filters.status !== "all" ? filters.status : undefined,
		exercice:
			filters.exercice && filters.exercice !== "all" ? parseInt(filters.exercice, 10) : undefined,
	})

	const todayPos = getTodayPosition(config)

	// Sort tasks by dateEcheance (earliest first)
	const sortedTaches = useMemo(() => {
		if (!taches) return []
		return [...taches]
			.filter((t) => t.dateEcheance)
			.sort((a, b) => (a.dateEcheance ?? 0) - (b.dateEcheance ?? 0))
	}, [taches])

	// Auto-scroll to center the today line
	useEffect(() => {
		if (!scrollContainerRef.current || todayPos <= 0 || todayPos >= 1) return
		const container = scrollContainerRef.current
		requestAnimationFrame(() => {
			const scrollTarget = todayPos * container.scrollWidth - container.clientWidth / 2
			container.scrollLeft = Math.max(0, scrollTarget)
		})
	}, [todayPos])

	// Min width per column
	const colCount = getColumnCount(config)
	const minColWidth = zoom === "annee" ? 80 : zoom === "semaine" ? 60 : 60
	const timelineWidth = Math.max(colCount * minColWidth, 800)

	if (taches === undefined) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-[52px] w-full" />
				))}
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Toolbar: zoom controls + task counter */}
			<div className="flex items-center justify-between">
				<div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
					{ZOOM_OPTIONS.map((opt) => (
						<Button
							key={opt.value}
							variant="ghost"
							size="sm"
							className={
								zoom === opt.value
									? "bg-white text-foreground shadow-sm hover:bg-white hover:text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}
							onClick={() => onZoomChange(opt.value)}
						>
							{opt.label}
						</Button>
					))}
				</div>

				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<div className="h-2 w-2 rounded-full bg-primary" />
					<span className="font-medium text-foreground">{sortedTaches.length} tâches</span>
					{taches.length !== sortedTaches.length && <span>/ {taches.length}</span>}
				</div>
			</div>

			{sortedTaches.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center border rounded-md">
					<Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
					<p className="text-lg font-medium">Aucune tâche</p>
					<p className="text-sm text-muted-foreground mt-1">
						Aucune tâche fiscale dans cette période.
					</p>
				</div>
			) : (
				<div className="border rounded-lg overflow-hidden bg-white">
					<div ref={scrollContainerRef} className="overflow-x-auto">
						<div style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
							{/* Sticky header */}
							<div className="sticky top-0 z-10 bg-white border-b">
								<GanttHeader config={config} />
							</div>

							{/* Task rows with today line */}
							<div className="relative">
								{/* Today line spanning all rows */}
								<GanttTodayLine position={todayPos} />

								{/* Task rows */}
								{sortedTaches.map((tache, i) => (
									<GanttTaskRow
										key={tache._id}
										nom={tache.nom}
										cerfa={tache.cerfa}
										clientName={tache.clientName}
										dateEcheance={tache.dateEcheance!}
										status={tache.status}
										config={config}
										isEven={i % 2 === 0}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
