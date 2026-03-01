"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type CalendarViewType = "month" | "week" | "day"

interface CalendarHeaderProps {
	date: Date
	view: CalendarViewType
	onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void
	onViewChange: (view: CalendarViewType) => void
	onNewEvent?: () => void
}

export function CalendarHeader({
	date,
	view,
	onNavigate,
	onViewChange,
	onNewEvent,
}: CalendarHeaderProps) {
	const label =
		view === "day"
			? format(date, "EEEE d MMMM yyyy", { locale: fr })
			: view === "week"
				? format(date, "'Semaine du' d MMMM yyyy", { locale: fr })
				: format(date, "MMMM yyyy", { locale: fr })

	return (
		<div className="flex items-center justify-between gap-4 flex-wrap">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8"
						onClick={() => onNavigate("PREV")}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8"
						onClick={() => onNavigate("NEXT")}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
				<Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("TODAY")}>
					Aujourd&apos;hui
				</Button>
				<h2 className="text-base font-semibold capitalize">{label}</h2>
			</div>

			<div className="flex items-center gap-3">
				<Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarViewType)}>
					<TabsList className="h-8">
						<TabsTrigger value="month" className="text-xs px-3">
							Mois
						</TabsTrigger>
						<TabsTrigger value="week" className="text-xs px-3">
							Semaine
						</TabsTrigger>
						<TabsTrigger value="day" className="text-xs px-3">
							Jour
						</TabsTrigger>
					</TabsList>
				</Tabs>
				{onNewEvent && (
					<Button size="sm" onClick={onNewEvent}>
						<Plus className="h-4 w-4 mr-1" />
						Nouvel événement
					</Button>
				)}
			</div>
		</div>
	)
}
