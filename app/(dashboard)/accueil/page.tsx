"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import {
	AlertTriangle,
	ArrowRight,
	Building2,
	CalendarDays,
	Clock,
	MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useCurrentUserContext } from "@/lib/contexts/current-user"
import { useTotalUnread } from "@/lib/hooks/use-total-unread"

function getGreeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) return "Bonjour"
	if (hour < 18) return "Bon après-midi"
	return "Bonsoir"
}

export default function AccueilPage() {
	const { user } = useCurrentUserContext()
	const totalUnread = useTotalUnread()

	const clients = useQuery(api.clients.list, {})
	const tachesStats = useQuery(api.taches.stats)
	const taches = useQuery(api.taches.list, {})

	const now = useMemo(() => Date.now(), [])
	const weekEnd = useMemo(() => now + 7 * 24 * 60 * 60 * 1000, [now])

	const upcomingEvents = useQuery(api.calendar.listTeamEvents, {
		start: now,
		end: weekEnd,
	})

	const userName = (user as Record<string, unknown>)?.name as string | undefined
	const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })

	const upcomingDeadlines = useMemo(() => {
		if (!taches) return []
		return taches
			.filter((t) => t.status !== "termine" && t.dateEcheance && t.dateEcheance <= weekEnd)
			.sort((a, b) => (a.dateEcheance ?? 0) - (b.dateEcheance ?? 0))
			.slice(0, 5)
	}, [taches, weekEnd])

	const overdueCount = tachesStats?.enRetard ?? 0

	return (
		<div className="min-h-screen bg-[#F4F5F3]">
			{/* Welcome header */}
			<div className="px-6 py-8 bg-white border-b">
				<h1 className="text-2xl font-heading tracking-widest uppercase text-foreground">
					{getGreeting()}
					{userName ? `, ${userName}` : ""}
				</h1>
				<p className="text-sm text-muted-foreground mt-1.5 capitalize">{todayFormatted}</p>
			</div>

			<div className="px-6 py-6 space-y-6 max-w-5xl">
				{/* Quick stats row */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Link
						href="/messages"
						className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-v7-amethyste/10">
							<MessageSquare className="h-5 w-5 text-v7-amethyste" />
						</div>
						<div>
							<div className="text-2xl font-heading text-foreground leading-none">
								{totalUnread}
							</div>
							<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
								Messages non lus
							</div>
						</div>
					</Link>

					<Link
						href="/clients"
						className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-v7-emeraude/10">
							<Building2 className="h-5 w-5 text-v7-emeraude" />
						</div>
						<div>
							<div className="text-2xl font-heading text-foreground leading-none">
								{clients === undefined ? (
									<Skeleton className="h-7 w-8 inline-block" />
								) : (
									clients.length
								)}
							</div>
							<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
								Clients
							</div>
						</div>
					</Link>

					<Link
						href="/calendrier"
						className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-v7-emeraude/10">
							<CalendarDays className="h-5 w-5 text-v7-emeraude" />
						</div>
						<div>
							<div className="text-2xl font-heading text-foreground leading-none">
								{upcomingEvents === undefined ? (
									<Skeleton className="h-7 w-8 inline-block" />
								) : (
									upcomingEvents.length
								)}
							</div>
							<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
								Événements cette semaine
							</div>
						</div>
					</Link>

					{overdueCount > 0 ? (
						<Link
							href="/taches"
							className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 border-l-4 border-l-destructive"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
								<AlertTriangle className="h-5 w-5 text-destructive" />
							</div>
							<div>
								<div className="text-2xl font-heading text-destructive leading-none">
									{overdueCount}
								</div>
								<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
									Tâches en retard
								</div>
							</div>
						</Link>
					) : (
						<div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
								<Clock className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<div className="text-2xl font-heading text-green-600 leading-none">0</div>
								<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
									Retards
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Two columns */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Upcoming events */}
					<div className="bg-white rounded-lg shadow-sm p-5">
						<div className="flex items-center justify-between mb-4">
							<p className="text-xs uppercase tracking-widest text-muted-foreground">
								Prochains événements
							</p>
							<Link href="/calendrier">
								<Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
									Voir tout <ArrowRight className="h-3 w-3" />
								</Button>
							</Link>
						</div>
						{upcomingEvents === undefined ? (
							<div className="space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`evt-${i}`} className="h-12 w-full rounded-md" />
								))}
							</div>
						) : upcomingEvents.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-2" />
								<p className="text-sm text-muted-foreground">Aucun événement cette semaine</p>
								<Link href="/calendrier" className="mt-2">
									<Button variant="outline" size="sm" className="text-xs">
										Créer un événement
									</Button>
								</Link>
							</div>
						) : (
							<div className="space-y-2">
								{upcomingEvents.slice(0, 5).map((evt) => (
									<Link
										key={evt._id}
										href="/calendrier"
										className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
									>
										<div className="flex flex-col items-center justify-center rounded-md bg-v7-emeraude/10 text-v7-emeraude px-2 py-1 min-w-[44px]">
											<span className="text-lg font-heading leading-none">
												{format(new Date(evt.startAt), "d")}
											</span>
											<span className="text-[10px] uppercase">
												{format(new Date(evt.startAt), "MMM", { locale: fr })}
											</span>
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{evt.title}</p>
											<p className="text-[11px] text-muted-foreground">
												{evt.allDay
													? "Toute la journée"
													: format(new Date(evt.startAt), "HH:mm", {
															locale: fr,
														})}
												{evt.location && ` · ${evt.location}`}
											</p>
										</div>
									</Link>
								))}
							</div>
						)}
					</div>

					{/* Upcoming deadlines */}
					<div className="bg-white rounded-lg shadow-sm p-5">
						<div className="flex items-center justify-between mb-4">
							<p className="text-xs uppercase tracking-widest text-muted-foreground">
								Échéances à venir
							</p>
							<Link href="/taches">
								<Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
									Voir tout <ArrowRight className="h-3 w-3" />
								</Button>
							</Link>
						</div>
						{taches === undefined ? (
							<div className="space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`dl-${i}`} className="h-12 w-full rounded-md" />
								))}
							</div>
						) : upcomingDeadlines.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
								<p className="text-sm text-muted-foreground">Aucune échéance cette semaine</p>
							</div>
						) : (
							<div className="space-y-2">
								{upcomingDeadlines.map((tache) => {
									const isOverdue = tache.dateEcheance && tache.dateEcheance < Date.now()
									return (
										<Link
											key={tache._id}
											href={`/taches/${tache._id}`}
											className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
										>
											<div
												className={`flex flex-col items-center justify-center rounded-md px-2 py-1 min-w-[44px] ${
													isOverdue
														? "bg-destructive/10 text-destructive"
														: "bg-amber-50 text-amber-700"
												}`}
											>
												<span className="text-lg font-heading leading-none">
													{tache.dateEcheance ? format(new Date(tache.dateEcheance), "d") : "—"}
												</span>
												<span className="text-[10px] uppercase">
													{tache.dateEcheance
														? format(new Date(tache.dateEcheance), "MMM", {
																locale: fr,
															})
														: ""}
												</span>
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{tache.nom}</p>
												<p className="text-[11px] text-muted-foreground">
													{tache.clientName}
													{isOverdue && (
														<span className="ml-1.5 text-destructive font-medium">En retard</span>
													)}
												</p>
											</div>
										</Link>
									)
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
