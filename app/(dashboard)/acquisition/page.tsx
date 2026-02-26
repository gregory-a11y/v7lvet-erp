"use client"

import { useQuery } from "convex/react"
import { Target, TrendingUp, Trophy, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"

const STATUT_LABELS: Record<string, string> = {
	prospect: "Prospect",
	contact: "Contact",
	proposition: "Proposition",
	negociation: "Négociation",
	gagne: "Gagné",
	perdu: "Perdu",
}

const STATUT_COLORS: Record<string, string> = {
	prospect: "bg-gray-100 text-gray-700",
	contact: "bg-blue-50 text-blue-700",
	proposition: "bg-violet-50 text-violet-700",
	negociation: "bg-amber-50 text-amber-700",
	gagne: "bg-emerald-50 text-emerald-700",
	perdu: "bg-red-50 text-red-700",
}

const FUNNEL_ORDER = ["prospect", "contact", "proposition", "negociation", "gagne", "perdu"]
const FUNNEL_COLORS = ["#94a3b8", "#60a5fa", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"]

function formatMontant(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`
	return `${n} €`
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
	})
}

export default function AcquisitionPage() {
	const stats = useQuery(api.opportunites.stats)
	const router = useRouter()

	if (stats === undefined) {
		return (
			<div>
				<PageHeader title="Acquisition" description="Vue d'ensemble du pipeline commercial" />
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-28" />
						))}
					</div>
					<Skeleton className="h-64" />
					<Skeleton className="h-48" />
				</div>
			</div>
		)
	}

	const maxCount = Math.max(...FUNNEL_ORDER.map((s) => stats.byStatut[s] ?? 0), 1)

	return (
		<div>
			<PageHeader title="Acquisition" description="Vue d'ensemble du pipeline commercial" />

			<div className="p-6 space-y-6">
				{/* KPIs */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Total opportunités</p>
									<p className="text-2xl font-bold">{stats.total}</p>
								</div>
								<Target className="h-8 w-8 text-v7-amethyste/40" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Pipeline total</p>
									<p className="text-2xl font-bold">{formatMontant(stats.totalMontant)}</p>
								</div>
								<TrendingUp className="h-8 w-8 text-v7-emeraude/40" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Taux de conversion</p>
									<p className="text-2xl font-bold">{stats.tauxConversion}%</p>
								</div>
								<Trophy className="h-8 w-8 text-amber-400/60" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">En négociation</p>
									<p className="text-2xl font-bold">{stats.byStatut.negociation ?? 0}</p>
								</div>
								<Users className="h-8 w-8 text-blue-400/40" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Funnel */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Funnel par statut</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{FUNNEL_ORDER.map((statut, i) => {
								const count = stats.byStatut[statut] ?? 0
								const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
								return (
									<div key={statut} className="flex items-center gap-3">
										<span className="w-28 text-sm text-muted-foreground shrink-0">
											{STATUT_LABELS[statut]}
										</span>
										<div className="flex-1 h-8 bg-muted/30 rounded-md overflow-hidden">
											<div
												className="h-full rounded-md flex items-center px-3 text-xs font-medium text-white transition-all duration-500"
												style={{
													width: `${Math.max(pct, 8)}%`,
													backgroundColor: FUNNEL_COLORS[i],
												}}
											>
												{count}
											</div>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* Opportunités récentes */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Opportunités récentes</CardTitle>
					</CardHeader>
					<CardContent>
						{stats.recent.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								Aucune opportunité pour le moment
							</p>
						) : (
							<div className="space-y-3">
								{stats.recent.map((opp) => (
									<button
										type="button"
										key={opp._id}
										className="flex w-full items-center justify-between p-3 rounded-lg border hover:bg-muted/20 cursor-pointer transition-colors text-left"
										onClick={() => router.push("/opportunites")}
									>
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{opp.nom}</p>
											<p className="text-xs text-muted-foreground">
												{opp.contactNom && `${opp.contactNom} · `}
												{formatDate(opp.createdAt)}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{opp.montantEstime && (
												<span className="text-sm font-medium">
													{formatMontant(opp.montantEstime)}
												</span>
											)}
											<Badge variant="secondary" className={STATUT_COLORS[opp.statut] ?? ""}>
												{STATUT_LABELS[opp.statut] ?? opp.statut}
											</Badge>
										</div>
									</button>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
