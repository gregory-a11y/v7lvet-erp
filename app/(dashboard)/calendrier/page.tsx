"use client"

import {
	addDays,
	addMonths,
	addWeeks,
	endOfMonth,
	endOfWeek,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns"
import { motion } from "framer-motion"
import { Filter, Link2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { CalendarHeader, type CalendarViewType } from "@/components/calendar/calendar-header"
import { CalendarView } from "@/components/calendar/calendar-view"
import { ConnectionSettings } from "@/components/calendar/connection-settings"
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog"
import { NewEventDialog } from "@/components/calendar/new-event-dialog"
import { TeamSidebar } from "@/components/calendar/team-sidebar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Id } from "@/convex/_generated/dataModel"
import { fadeInUp, pageTransition } from "@/lib/animations"
import { useTeamEvents } from "@/lib/hooks/use-calendar"

interface CalendarEvent {
	_id: Id<"calendarEvents">
	title: string
	description?: string
	location?: string
	videoUrl?: string
	startAt: number
	endAt: number
	allDay: boolean
	source: "internal" | "google" | "microsoft"
	createdById: string
	participants?: {
		type: "team" | "client" | "external"
		userId?: string
		email?: string
		name?: string
		status: "pending" | "accepted" | "declined" | "tentative"
	}[]
}

export default function CalendrierPage() {
	const [date, setDate] = useState(new Date())
	const [view, setView] = useState<CalendarViewType>("month")
	const [newEventOpen, setNewEventOpen] = useState(false)
	const [newEventDefaultDate, setNewEventDefaultDate] = useState<Date | undefined>()
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const [detailOpen, setDetailOpen] = useState(false)
	const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())

	const dateRange = useMemo(() => {
		const weekOptions = { weekStartsOn: 1 as const }
		if (view === "month") {
			const ms = startOfWeek(startOfMonth(date), weekOptions)
			const me = endOfWeek(endOfMonth(date), weekOptions)
			return { start: ms.getTime(), end: me.getTime() }
		}
		if (view === "week") {
			const ws = startOfWeek(date, weekOptions)
			const we = endOfWeek(date, weekOptions)
			return { start: ws.getTime(), end: we.getTime() }
		}
		const ds = new Date(date)
		ds.setHours(0, 0, 0, 0)
		const de = new Date(date)
		de.setHours(23, 59, 59, 999)
		return { start: ds.getTime(), end: de.getTime() }
	}, [date, view])

	const { events } = useTeamEvents(dateRange.start, dateRange.end)

	const filteredEvents = useMemo(() => {
		if (!events) return []
		if (selectedMembers.size === 0) return events as CalendarEvent[]
		return (events as CalendarEvent[]).filter((e) => {
			if (selectedMembers.has(e.createdById)) return true
			if (e.participants?.some((p) => p.userId && selectedMembers.has(p.userId))) return true
			return false
		})
	}, [events, selectedMembers])

	const handleNavigate = useCallback(
		(action: "PREV" | "NEXT" | "TODAY") => {
			if (action === "TODAY") {
				setDate(new Date())
				return
			}
			const direction = action === "NEXT" ? 1 : -1
			if (view === "month") {
				setDate((d) => (direction > 0 ? addMonths(d, 1) : subMonths(d, 1)))
			} else if (view === "week") {
				setDate((d) => (direction > 0 ? addWeeks(d, 1) : subWeeks(d, 1)))
			} else {
				setDate((d) => (direction > 0 ? addDays(d, 1) : subDays(d, 1)))
			}
		},
		[view],
	)

	const handleDateNavigate = useCallback((newDate: Date) => {
		setDate(newDate)
	}, [])

	const handleSelectEvent = useCallback((event: CalendarEvent) => {
		setSelectedEvent(event)
		setDetailOpen(true)
	}, [])

	const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
		setNewEventDefaultDate(slotInfo.start)
		setNewEventOpen(true)
	}, [])

	const handleToggleMember = useCallback((userId: string) => {
		setSelectedMembers((prev) => {
			const next = new Set(prev)
			if (next.has(userId)) {
				next.delete(userId)
			} else {
				next.add(userId)
			}
			return next
		})
	}, [])

	return (
		<motion.div
			variants={pageTransition}
			initial="initial"
			animate="animate"
			exit="exit"
			className="flex flex-col h-full"
		>
			{/* Header with filter/connect popovers */}
			<div className="flex items-start justify-between border-b bg-white px-6 py-5">
				<div>
					<h1 className="text-lg tracking-widest font-heading text-foreground">Calendrier</h1>
					<div className="mt-1 h-0.5 w-8 bg-primary rounded-full" />
					<p className="text-sm text-muted-foreground mt-2">Gérez vos événements et rendez-vous</p>
				</div>
				<div className="flex items-center gap-2">
					{/* Team filter popover */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Filter className="h-3.5 w-3.5" />
								Équipe
								{selectedMembers.size > 0 && (
									<span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-v7-amethyste px-1.5 text-[10px] font-bold text-white">
										{selectedMembers.size}
									</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-56">
							<TeamSidebar selectedMembers={selectedMembers} onToggleMember={handleToggleMember} />
						</PopoverContent>
					</Popover>

					{/* External calendars popover */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Link2 className="h-3.5 w-3.5" />
								Connexions
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-72">
							<ConnectionSettings />
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{/* Calendar takes full width */}
			<motion.div variants={fadeInUp} className="flex flex-col flex-1 p-6 gap-4 min-h-0">
				<CalendarHeader
					date={date}
					view={view}
					onNavigate={handleNavigate}
					onViewChange={setView}
					onNewEvent={() => {
						setNewEventDefaultDate(undefined)
						setNewEventOpen(true)
					}}
				/>

				<CalendarView
					events={filteredEvents}
					date={date}
					view={view}
					onNavigate={handleDateNavigate}
					onViewChange={setView}
					onSelectEvent={handleSelectEvent}
					onSelectSlot={handleSelectSlot}
				/>
			</motion.div>

			<NewEventDialog
				open={newEventOpen}
				onOpenChange={setNewEventOpen}
				defaultDate={newEventDefaultDate}
			/>

			<EventDetailDialog event={selectedEvent} open={detailOpen} onOpenChange={setDetailOpen} />
		</motion.div>
	)
}
