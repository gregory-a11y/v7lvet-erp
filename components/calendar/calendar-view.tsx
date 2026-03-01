"use client"

import { format, getDay, parse, startOfWeek } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { useCallback, useMemo } from "react"
import { Calendar, dateFnsLocalizer, type NavigateAction, type View } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
import type { Id } from "@/convex/_generated/dataModel"
import type { CalendarViewType } from "./calendar-header"

const locales = { fr }

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
	getDay,
	locales,
})

const SOURCE_COLORS: Record<string, string> = {
	internal: "#2E6965",
	google: "#6242FB",
	microsoft: "#5B5FC7",
}

interface CalendarEventItem {
	_id: Id<"calendarEvents">
	title: string
	startAt: number
	endAt: number
	allDay: boolean
	source: "internal" | "google" | "microsoft"
	createdById: string
	description?: string
	location?: string
	videoUrl?: string
	participants?: {
		type: "team" | "client" | "external"
		userId?: string
		email?: string
		name?: string
		status: "pending" | "accepted" | "declined" | "tentative"
	}[]
}

interface BigCalendarEvent {
	id: string
	title: string
	start: Date
	end: Date
	allDay: boolean
	resource: CalendarEventItem
}

interface CalendarViewProps {
	events: CalendarEventItem[]
	date: Date
	view: CalendarViewType
	onNavigate: (date: Date) => void
	onViewChange: (view: CalendarViewType) => void
	onSelectEvent: (event: CalendarEventItem) => void
	onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
}

function EventComponent({ event }: { event: BigCalendarEvent }) {
	const color = SOURCE_COLORS[event.resource.source] ?? "#2E6965"
	return (
		<div
			className="text-xs px-1.5 py-0.5 rounded text-white truncate"
			style={{ backgroundColor: color }}
		>
			{event.title}
		</div>
	)
}

const VIEW_MAP: Record<CalendarViewType, View> = {
	month: "month",
	week: "week",
	day: "day",
}

export function CalendarView({
	events,
	date,
	view,
	onNavigate,
	onViewChange,
	onSelectEvent,
	onSelectSlot,
}: CalendarViewProps) {
	const bigCalendarEvents: BigCalendarEvent[] = useMemo(
		() =>
			events.map((e) => ({
				id: e._id,
				title: e.title,
				start: new Date(e.startAt),
				end: new Date(e.endAt),
				allDay: e.allDay,
				resource: e,
			})),
		[events],
	)

	const handleSelectEvent = useCallback(
		(event: BigCalendarEvent) => {
			onSelectEvent(event.resource)
		},
		[onSelectEvent],
	)

	const handleSelectSlot = useCallback(
		(slotInfo: { start: Date; end: Date }) => {
			onSelectSlot?.(slotInfo)
		},
		[onSelectSlot],
	)

	const handleNavigate = useCallback(
		(newDate: Date, _view: View, _action: NavigateAction) => {
			onNavigate(newDate)
		},
		[onNavigate],
	)

	const handleViewChange = useCallback(
		(newView: View) => {
			onViewChange(newView as CalendarViewType)
		},
		[onViewChange],
	)

	const eventStyleGetter = useCallback(
		(event: BigCalendarEvent) => ({
			style: {
				backgroundColor: SOURCE_COLORS[event.resource.source] ?? "#2E6965",
				border: "none",
				borderRadius: "4px",
				fontSize: "12px",
			},
		}),
		[],
	)

	return (
		<div className="v7-calendar" style={{ height: 700 }}>
			<Calendar
				localizer={localizer}
				events={bigCalendarEvents}
				date={date}
				view={VIEW_MAP[view]}
				onNavigate={handleNavigate}
				onView={handleViewChange}
				onSelectEvent={handleSelectEvent}
				onSelectSlot={handleSelectSlot}
				selectable={onSelectSlot ? "ignoreEvents" : false}
				popup
				toolbar={false}
				culture="fr"
				messages={{
					today: "Aujourd'hui",
					previous: "Précédent",
					next: "Suivant",
					month: "Mois",
					week: "Semaine",
					day: "Jour",
					agenda: "Agenda",
					date: "Date",
					time: "Heure",
					event: "Événement",
					noEventsInRange: "Aucun événement sur cette période",
					showMore: (total) => `+${total} de plus`,
				}}
				eventPropGetter={eventStyleGetter}
				components={{
					event: EventComponent,
				}}
				style={{ height: "100%" }}
			/>
		</div>
	)
}
