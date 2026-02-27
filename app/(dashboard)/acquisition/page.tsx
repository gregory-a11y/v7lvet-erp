"use client"

import { useQuery } from "convex/react"
import { ArrowUpRight, DollarSign, Handshake, Target, Trophy, Users } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import type { TooltipContentProps } from "recharts/types/component/Tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
	prospect: "Prospect",
	contact: "Contact",
	proposition: "Proposition",
	negociation: "Négociation",
	gagne: "Gagné",
	perdu: "Perdu",
}

const STATUT_BADGE_COLORS: Record<string, string> = {
	prospect: "bg-gray-100 text-gray-700",
	contact: "bg-sky-50 text-sky-700",
	proposition: "bg-violet-50 text-violet-700",
	negociation: "bg-amber-50 text-amber-700",
	gagne: "bg-emerald-50 text-emerald-700",
	perdu: "bg-red-50 text-red-700",
}

const PIPELINE_ORDER = ["prospect", "contact", "proposition", "negociation", "gagne"]
const FUNNEL_ORDER = [...PIPELINE_ORDER, "perdu"]

const FUNNEL_COLORS: Record<string, string> = {
	prospect: "#94a3b8",
	contact: "#60a5fa",
	proposition: "#8b5cf6",
	negociation: "#f59e0b",
	gagne: "#2E6965",
	perdu: "#ef4444",
}

const SOURCE_LABELS: Record<string, string> = {
	recommandation: "Recommandation",
	reseau: "Réseau",
	site_web: "Site web",
	salon: "Salon",
	autre: "Autre",
}
const SOURCE_COLORS: Record<string, string> = {
	recommandation: "#2E6965",
	reseau: "#6242FB",
	site_web: "#063238",
	salon: "#059669",
	autre: "#94a3b8",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMontant(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`
	return `${n.toLocaleString("fr-FR")} €`
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

function pluralize(n: number, singular: string, plural: string): string {
	return n > 1 ? plural : singular
}

// ─── Chart Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
	if (!active || !payload?.length) return null
	return (
		<div className="rounded-lg border bg-card px-3 py-2 shadow-md">
			{label && <p className="text-xs font-medium text-foreground">{String(label)}</p>}
			{payload.map((entry) => (
				<p key={String(entry.name ?? entry.dataKey)} className="text-xs text-muted-foreground">
					{entry.name ?? entry.dataKey}:{" "}
					<span className="font-semibold text-foreground">{String(entry.value)}</span>
				</p>
			))}
		</div>
	)
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
	title,
	value,
	subtitle,
	icon: Icon,
	iconColor,
	accent,
}: {
	title: string
	value: string
	subtitle?: string
	icon: React.ElementType
	iconColor: string
	accent?: { label: string; positive: boolean }
}) {
	return (
		<Card className="relative overflow-hidden">
			<CardContent className="pt-6 pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							{title}
						</p>
						<p className="text-2xl font-bold tracking-tight">{value}</p>
						{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
						{accent && (
							<div
								className={`inline-flex items-center gap-1 text-xs font-medium ${accent.positive ? "text-v7-emeraude" : "text-destructive"}`}
							>
								<ArrowUpRight className="h-3 w-3" />
								{accent.label}
							</div>
						)}
					</div>
					<div className="rounded-xl p-2.5" style={{ backgroundColor: `${iconColor}12` }}>
						<Icon className="h-5 w-5" style={{ color: iconColor }} />
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AcquisitionPage() {
	const stats = useQuery(api.opportunites.stats)

	// ── Memoized chart data ──
	const funnelData = useMemo(() => {
		if (!stats) return []
		return FUNNEL_ORDER.map((statut) => ({
			name: STATUT_LABELS[statut],
			count: stats.byStatut[statut] ?? 0,
			fill: FUNNEL_COLORS[statut],
		}))
	}, [stats])

	const sourceData = useMemo(() => {
		if (!stats) return []
		return Object.entries(stats.bySource).map(([source, count]) => ({
			name: SOURCE_LABELS[source] ?? source,
			value: count,
			fill: SOURCE_COLORS[source] ?? "#94a3b8",
		}))
	}, [stats])

	const montantData = useMemo(() => {
		if (!stats) return []
		return PIPELINE_ORDER.map((statut) => ({
			name: STATUT_LABELS[statut],
			montant: stats.montantByStatut[statut] ?? 0,
			fill: FUNNEL_COLORS[statut],
		}))
	}, [stats])

	const funnelIsEmpty = funnelData.every((d) => d.count === 0)
	const montantIsEmpty = montantData.every((d) => d.montant === 0)

	if (stats === undefined) {
		return (
			<div>
				<PageHeader title="Acquisition" description="Vue d'ensemble du pipeline commercial" />
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={`kpi-${i}`} className="h-28 rounded-xl" />
						))}
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<Skeleton className="h-80 lg:col-span-2 rounded-xl" />
						<Skeleton className="h-80 rounded-xl" />
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Skeleton className="h-72 rounded-xl" />
						<Skeleton className="h-72 rounded-xl" />
					</div>
				</div>
			</div>
		)
	}

	const gagnesCount = stats.byStatut.gagne ?? 0

	return (
		<div>
			<PageHeader title="Acquisition" description="Vue d'ensemble du pipeline commercial" />

			<div className="p-6 space-y-6">
				{/* ── KPI Row ── */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<KpiCard
						title="Pipeline actif"
						value={stats.pipelineCount.toString()}
						subtitle={`${formatMontant(stats.montantPipeline)} en cours`}
						icon={Target}
						iconColor="#6242FB"
					/>
					<KpiCard
						title="Valeur totale"
						value={stats.totalMontant > 0 ? formatMontant(stats.totalMontant) : "—"}
						subtitle={`${stats.total} ${pluralize(stats.total, "opportunité", "opportunités")}`}
						icon={DollarSign}
						iconColor="#2E6965"
					/>
					<KpiCard
						title="Conversion"
						value={`${stats.tauxConversion}%`}
						subtitle={`${gagnesCount} ${pluralize(gagnesCount, "gagné", "gagnés")}`}
						icon={Trophy}
						iconColor="#f59e0b"
					/>
					<KpiCard
						title="Gagné"
						value={stats.montantGagne > 0 ? formatMontant(stats.montantGagne) : "—"}
						subtitle={`${gagnesCount} ${pluralize(gagnesCount, "deal closé", "deals closés")}`}
						icon={Handshake}
						iconColor="#2E6965"
					/>
				</div>

				{/* ── Row 2: Funnel + Sources ── */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Funnel Chart */}
					<Card className="lg:col-span-2">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Funnel par statut</CardTitle>
						</CardHeader>
						<CardContent>
							{funnelIsEmpty ? (
								<div className="flex flex-col items-center justify-center h-[220px] sm:h-[300px] text-sm text-muted-foreground">
									<Target className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucune opportunité dans le pipeline
								</div>
							) : (
								<figure aria-label="Répartition des opportunités par statut">
									<div className="h-[220px] sm:h-[300px]">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={funnelData}
												layout="vertical"
												margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
												barSize={28}
											>
												<CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e8eae6" />
												<XAxis type="number" hide domain={[0, "dataMax + 1"]} />
												<YAxis
													type="category"
													dataKey="name"
													width={90}
													tick={{ fontSize: 12, fill: "#4a6b6a" }}
													axisLine={false}
													tickLine={false}
												/>
												<Tooltip content={ChartTooltip} />
												<Bar dataKey="count" name="Opportunités" radius={[0, 6, 6, 0]}>
													{funnelData.map((entry, idx) => (
														<Cell key={`funnel-${idx}`} fill={entry.fill} />
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								</figure>
							)}
						</CardContent>
					</Card>

					{/* Sources Donut */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Sources</CardTitle>
						</CardHeader>
						<CardContent>
							{sourceData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[220px] sm:h-[300px] text-sm text-muted-foreground">
									<Users className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucune source renseignée
								</div>
							) : (
								<figure aria-label="Répartition des opportunités par source">
									<ResponsiveContainer width="100%" height={180}>
										<PieChart>
											<Pie
												data={sourceData}
												cx="50%"
												cy="50%"
												innerRadius={45}
												outerRadius={72}
												paddingAngle={3}
												dataKey="value"
												stroke="none"
											>
												{sourceData.map((entry, idx) => (
													<Cell key={`source-${idx}`} fill={entry.fill} />
												))}
											</Pie>
											<Tooltip content={ChartTooltip} />
										</PieChart>
									</ResponsiveContainer>
									<div className="space-y-2 mt-3">
										{sourceData.map((s, idx) => (
											<div
												key={`legend-${idx}`}
												className="flex items-center justify-between text-xs"
											>
												<div className="flex items-center gap-2">
													<span
														className="h-2.5 w-2.5 rounded-full shrink-0"
														style={{ backgroundColor: s.fill }}
													/>
													<span className="text-muted-foreground">{s.name}</span>
												</div>
												<span className="font-semibold">{s.value}</span>
											</div>
										))}
									</div>
								</figure>
							)}
						</CardContent>
					</Card>
				</div>

				{/* ── Row 3: Montant par statut + Opportunités récentes ── */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Montant par étape */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Valeur par étape</CardTitle>
						</CardHeader>
						<CardContent>
							{montantIsEmpty ? (
								<div className="flex flex-col items-center justify-center h-[220px] sm:h-[260px] text-sm text-muted-foreground">
									<DollarSign className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucun montant renseigné
								</div>
							) : (
								<figure aria-label="Montant estimé par étape du pipeline">
									<div className="h-[220px] sm:h-[260px]">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={montantData}
												margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
											>
												<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8eae6" />
												<XAxis
													dataKey="name"
													tick={{ fontSize: 11, fill: "#4a6b6a" }}
													axisLine={false}
													tickLine={false}
												/>
												<YAxis
													tick={{ fontSize: 11, fill: "#4a6b6a" }}
													axisLine={false}
													tickLine={false}
													tickFormatter={(v: number) => formatMontant(v)}
												/>
												<Tooltip content={ChartTooltip} />
												<Bar dataKey="montant" name="Montant" radius={[6, 6, 0, 0]} barSize={36}>
													{montantData.map((entry, idx) => (
														<Cell key={`montant-${idx}`} fill={entry.fill} />
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								</figure>
							)}
						</CardContent>
					</Card>

					{/* Opportunités récentes */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">Dernières opportunités</CardTitle>
								<Link href="/opportunites" className="text-xs text-primary hover:underline">
									Voir tout
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							{stats.recent.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[260px] text-sm text-muted-foreground">
									<Users className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucune opportunité
								</div>
							) : (
								<div className="space-y-1">
									{stats.recent.map((opp) => (
										<Link
											key={opp._id}
											href="/opportunites"
											className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors"
										>
											<div
												className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
												style={{
													backgroundColor: FUNNEL_COLORS[opp.statut] ?? "#94a3b8",
												}}
											>
												{(opp.nom.charAt(0) || "?").toUpperCase()}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{opp.nom}</p>
												<p className="text-[11px] text-muted-foreground">
													{opp.contactNom && `${opp.contactNom} · `}
													{formatDate(opp.createdAt)}
												</p>
											</div>
											<div className="flex flex-col items-end gap-1">
												{opp.montantEstime && (
													<span className="text-xs font-semibold">
														{formatMontant(opp.montantEstime)}
													</span>
												)}
												<Badge
													variant="secondary"
													className={`text-[11px] ${STATUT_BADGE_COLORS[opp.statut] ?? ""}`}
												>
													{STATUT_LABELS[opp.statut] ?? opp.statut}
												</Badge>
											</div>
										</Link>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
