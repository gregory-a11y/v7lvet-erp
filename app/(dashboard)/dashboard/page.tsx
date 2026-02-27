"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { AlertTriangle, ArrowRight, Loader, TicketCheck, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import { STATUS_LABELS } from "@/lib/constants"
import { useCurrentUserContext } from "@/lib/contexts/current-user"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-700",
	en_cours: "bg-emerald-50 text-emerald-700",
	en_attente: "bg-amber-50 text-amber-700",
	termine: "bg-green-50 text-green-700",
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "\u2014"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function isOverdue(dateEcheance: number | undefined, status: string): boolean {
	if (!dateEcheance || status === "termine") return false
	return dateEcheance < Date.now()
}

function getGreeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) return "Bonjour"
	if (hour < 18) return "Bon après-midi"
	return "Bonsoir"
}

export default function DashboardPage() {
	const router = useRouter()
	const { user } = useCurrentUserContext()

	const clients = useQuery(api.clients.list, {})
	const tachesStats = useQuery(api.taches.stats)
	const taches = useQuery(api.taches.list, {})
	const ticketsOuverts = useQuery(api.tickets.list, { status: "ouvert" })

	const isLoading =
		clients === undefined ||
		tachesStats === undefined ||
		taches === undefined ||
		ticketsOuverts === undefined

	const recentTaches = taches?.filter((t) => t.status !== "termine").slice(0, 8)

	const userName = (user as Record<string, unknown>)?.name as string | undefined
	const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })

	return (
		<div className="min-h-screen bg-[#F4F5F3]">
			{/* Welcome header */}
			<div className="px-6 py-6 border-b bg-white">
				<h1 className="text-xl font-heading tracking-widest uppercase text-foreground">
					{getGreeting()}
					{userName ? `, ${userName}` : ""}
				</h1>
				<p className="text-sm text-muted-foreground mt-1 capitalize">{todayFormatted}</p>
			</div>

			<div className="px-6 py-6 space-y-6">
				{/* KPI Cards */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{isLoading ? (
						Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={`kpi-${i}`} className="h-[110px] w-full rounded-lg" />
						))
					) : (
						<>
							<div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-[#2E6965] relative overflow-hidden">
								<Users
									className="absolute top-4 right-4 h-12 w-12 text-[#2E6965] opacity-20"
									aria-hidden="true"
								/>
								<div className="text-4xl font-heading text-foreground leading-none">
									{clients?.length ?? 0}
								</div>
								<div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
									Total clients
								</div>
							</div>

							<div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-destructive relative overflow-hidden">
								<AlertTriangle
									className="absolute top-4 right-4 h-12 w-12 text-destructive opacity-20"
									aria-hidden="true"
								/>
								<div className="text-4xl font-heading text-destructive leading-none">
									{tachesStats?.enRetard ?? 0}
								</div>
								<div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
									Tâches en retard
								</div>
							</div>

							<div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-[#2E6965] relative overflow-hidden">
								<Loader
									className="absolute top-4 right-4 h-12 w-12 text-[#2E6965] opacity-20"
									aria-hidden="true"
								/>
								<div className="text-4xl font-heading text-[#2E6965] leading-none">
									{tachesStats?.enCours ?? 0}
								</div>
								<div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
									Tâches en cours
								</div>
							</div>

							<div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-[#6242FB] relative overflow-hidden">
								<TicketCheck
									className="absolute top-4 right-4 h-12 w-12 text-[#6242FB] opacity-20"
									aria-hidden="true"
								/>
								<div className="text-4xl font-heading text-[#6242FB] leading-none">
									{ticketsOuverts?.length ?? 0}
								</div>
								<div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
									Tickets ouverts
								</div>
							</div>
						</>
					)}
				</div>

				{/* Task distribution */}
				<div>
					<div className="bg-white rounded-lg shadow-sm p-5">
						<p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
							Répartition des tâches
						</p>
						{tachesStats === undefined ? (
							<Skeleton className="h-[76px] w-full rounded-lg" />
						) : (
							<div className="grid grid-cols-3 md:grid-cols-6 gap-3">
								<div className="rounded-md p-4 text-center border">
									<div className="text-2xl font-heading text-foreground leading-none">
										{tachesStats.total}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										Total
									</div>
								</div>
								<div className="rounded-md p-4 text-center border">
									<div className="text-2xl font-heading text-gray-500 leading-none">
										{tachesStats.aVenir}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										À venir
									</div>
								</div>
								<div className="rounded-md p-4 text-center border">
									<div className="text-2xl font-heading text-[#2E6965] leading-none">
										{tachesStats.enCours}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										En cours
									</div>
								</div>
								<div className="rounded-md p-4 text-center border">
									<div className="text-2xl font-heading text-amber-600 leading-none">
										{tachesStats.enAttente}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										En attente
									</div>
								</div>
								<div className="rounded-md p-4 text-center border">
									<div className="text-2xl font-heading text-green-600 leading-none">
										{tachesStats.termine}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										Terminé
									</div>
								</div>
								<div className="rounded-md p-4 text-center border border-t-2 border-t-destructive">
									<div className="text-2xl font-heading text-destructive leading-none">
										{tachesStats.enRetard}
									</div>
									<div className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5">
										En retard
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Recent tasks table */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<p className="text-xs uppercase tracking-widest text-muted-foreground">
							Prochaines tâches
						</p>
						<Link href="/taches">
							<Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
								Voir tout <ArrowRight className="h-3 w-3" />
							</Button>
						</Link>
					</div>
					{taches === undefined ? (
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={`task-${i}`} className="h-12 w-full rounded-md" />
							))}
						</div>
					) : recentTaches && recentTaches.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg shadow-sm">
							<p className="text-sm text-muted-foreground">Aucune tâche à venir</p>
						</div>
					) : (
						<div className="bg-white rounded-lg shadow-sm overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-[#F4F5F3] border-b border-gray-100 hover:bg-[#F4F5F3]">
										<TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium border-0 py-3">
											Tâche
										</TableHead>
										<TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground font-medium border-0 py-3">
											Client
										</TableHead>
										<TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium border-0 py-3">
											Échéance
										</TableHead>
										<TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium border-0 py-3">
											Statut
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{recentTaches?.map((tache) => {
										const overdue = isOverdue(tache.dateEcheance, tache.status)
										return (
											<TableRow
												key={tache._id}
												className="cursor-pointer hover:bg-[#F4F5F3]/50 transition-colors border-b border-gray-50 last:border-0"
												onClick={() => router.push(`/taches/${tache._id}`)}
											>
												<TableCell className="py-3.5">
													<div className="flex items-center gap-2">
														<span className="font-medium text-sm text-foreground">{tache.nom}</span>
														{overdue && (
															<span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-destructive/10 text-destructive">
																Retard
															</span>
														)}
													</div>
												</TableCell>
												<TableCell className="hidden md:table-cell text-sm text-muted-foreground py-3.5">
													{tache.clientName}
												</TableCell>
												<TableCell
													className={`text-sm py-3.5 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
												>
													{formatDate(tache.dateEcheance)}
												</TableCell>
												<TableCell className="py-3.5">
													<span
														className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STATUS_COLORS[tache.status] ?? "bg-gray-100 text-gray-700"}`}
													>
														{STATUS_LABELS[tache.status] ?? tache.status}
													</span>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
