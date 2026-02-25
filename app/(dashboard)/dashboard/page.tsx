"use client"

import { useQuery } from "convex/react"
import { AlertTriangle, Loader, TicketCheck, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useSession } from "@/lib/auth-client"
import { STATUS_LABELS } from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
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

export default function DashboardPage() {
	const router = useRouter()
	const { data: session } = useSession()

	const clients = useQuery(api.clients.list, {})
	const tachesStats = useQuery(api.taches.stats)
	const taches = useQuery(api.taches.list, {})
	const ticketsOuverts = useQuery(api.tickets.list, { status: "ouvert" })

	const isLoading =
		clients === undefined ||
		tachesStats === undefined ||
		taches === undefined ||
		ticketsOuverts === undefined

	const recentTaches = taches?.filter((t) => t.status !== "termine").slice(0, 10)

	const userName = (session?.user as Record<string, unknown>)?.name as string | undefined

	return (
		<div>
			<PageHeader
				title="Tableau de bord"
				description={
					userName ? `Bonjour ${userName}` : "Vue d'ensemble de l'activit\u00e9 du cabinet"
				}
			/>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-6">
				{isLoading ? (
					Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28 w-full rounded-lg" />
					))
				) : (
					<>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Total clients
								</CardTitle>
								<Users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{clients?.length ?? 0}</div>
							</CardContent>
						</Card>

						<Card className="border-red-200 bg-red-50/50">
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									T\u00e2ches en retard
								</CardTitle>
								<AlertTriangle className="h-4 w-4 text-red-500" />
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-red-600">{tachesStats?.enRetard ?? 0}</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									T\u00e2ches en cours
								</CardTitle>
								<Loader className="h-4 w-4 text-emerald-600" />
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-emerald-600">
									{tachesStats?.enCours ?? 0}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Tickets ouverts
								</CardTitle>
								<TicketCheck className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{ticketsOuverts?.length ?? 0}</div>
							</CardContent>
						</Card>
					</>
				)}
			</div>

			{/* Taches Stats Section */}
			<div className="px-6 pb-4">
				<h2 className="text-lg font-semibold mb-3">R\u00e9partition des t\u00e2ches</h2>
				{tachesStats === undefined ? (
					<Skeleton className="h-20 w-full rounded-lg" />
				) : (
					<div className="grid grid-cols-2 md:grid-cols-6 gap-3">
						<div className="rounded-md border p-3 text-center">
							<div className="text-2xl font-bold">{tachesStats.total}</div>
							<div className="text-xs text-muted-foreground">Total</div>
						</div>
						<div className="rounded-md border p-3 text-center">
							<div className="text-2xl font-bold text-gray-600">{tachesStats.aVenir}</div>
							<div className="text-xs text-muted-foreground">\u00c0 venir</div>
						</div>
						<div className="rounded-md border p-3 text-center">
							<div className="text-2xl font-bold text-emerald-600">{tachesStats.enCours}</div>
							<div className="text-xs text-muted-foreground">En cours</div>
						</div>
						<div className="rounded-md border p-3 text-center">
							<div className="text-2xl font-bold text-amber-600">{tachesStats.enAttente}</div>
							<div className="text-xs text-muted-foreground">En attente</div>
						</div>
						<div className="rounded-md border p-3 text-center">
							<div className="text-2xl font-bold text-green-600">{tachesStats.termine}</div>
							<div className="text-xs text-muted-foreground">Termin\u00e9</div>
						</div>
						<div className="rounded-md border p-3 text-center border-red-200 bg-red-50">
							<div className="text-2xl font-bold text-red-600">{tachesStats.enRetard}</div>
							<div className="text-xs text-muted-foreground">En retard</div>
						</div>
					</div>
				)}
			</div>

			{/* Recent Tasks Table */}
			<div className="px-6 pb-6">
				<h2 className="text-lg font-semibold mb-3">Prochaines t\u00e2ches</h2>
				{taches === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : recentTaches && recentTaches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center rounded-md border">
						<p className="text-muted-foreground">Aucune t\u00e2che \u00e0 venir</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>T\u00e2che</TableHead>
									<TableHead className="hidden md:table-cell">Client</TableHead>
									<TableHead>\u00c9ch\u00e9ance</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentTaches?.map((tache) => {
									const overdue = isOverdue(tache.dateEcheance, tache.status)

									return (
										<TableRow
											key={tache._id}
											className="cursor-pointer"
											onClick={() => router.push(`/taches/${tache._id}`)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<span className="font-medium">{tache.nom}</span>
													{overdue && (
														<Badge variant="destructive" className="text-xs">
															En retard
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell className="hidden md:table-cell text-muted-foreground">
												{tache.clientName}
											</TableCell>
											<TableCell className={overdue ? "text-red-600 font-medium" : ""}>
												{formatDate(tache.dateEcheance)}
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className={STATUS_COLORS[tache.status] ?? ""}>
													{STATUS_LABELS[tache.status] ?? tache.status}
												</Badge>
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
	)
}
