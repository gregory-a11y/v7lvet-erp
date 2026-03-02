"use client"

import { Euro, Target, TrendingUp, Trophy, Users } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
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
import {
	buildColorMap,
	buildLabelMap,
	usePrestations,
	useSources,
} from "@/lib/hooks/use-lead-options"
import { useLeadStats } from "@/lib/hooks/use-leads"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
	prise_de_contact: "Prise de contact",
	rendez_vous: "Rendez-vous",
	qualification: "Qualification",
	go_no_go: "Go / No Go",
	valide: "Validé",
	onboarding: "Onboarding",
	perdu: "Perdu",
	a_relancer: "À relancer",
}

const STATUT_BADGE_COLORS: Record<string, string> = {
	prise_de_contact: "bg-gray-100 text-gray-700",
	rendez_vous: "bg-blue-50 text-blue-700",
	qualification: "bg-violet-50 text-violet-700",
	go_no_go: "bg-amber-50 text-amber-700",
	valide: "bg-emerald-50 text-emerald-700",
	onboarding: "bg-green-50 text-green-700",
	perdu: "bg-red-50 text-red-700",
	a_relancer: "bg-orange-50 text-orange-700",
}

const FUNNEL_ORDER = [
	"prise_de_contact",
	"rendez_vous",
	"qualification",
	"go_no_go",
	"valide",
	"onboarding",
	"perdu",
]

const FUNNEL_COLORS: Record<string, string> = {
	prise_de_contact: "#94a3b8",
	rendez_vous: "#60a5fa",
	qualification: "#8b5cf6",
	go_no_go: "#f59e0b",
	valide: "#2E6965",
	onboarding: "#059669",
	perdu: "#ef4444",
	a_relancer: "#f97316",
}

const PIPELINE_ORDER = [
	"prise_de_contact",
	"rendez_vous",
	"qualification",
	"go_no_go",
	"valide",
	"onboarding",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMontant(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`
	return `${n.toLocaleString("fr-FR")} €`
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
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
}: {
	title: string
	value: string
	subtitle?: string
	icon: React.ElementType
	iconColor: string
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
	const stats = useLeadStats()
	const sourcesOpts = useSources()
	const prestationsOpts = usePrestations()
	const sourceLabels = useMemo(() => buildLabelMap(sourcesOpts), [sourcesOpts])
	const sourceColors = useMemo(() => buildColorMap(sourcesOpts), [sourcesOpts])
	const prestationLabels = useMemo(() => buildLabelMap(prestationsOpts), [prestationsOpts])

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
			name: sourceLabels[source] ?? source,
			value: count,
			fill: sourceColors[source] ?? "#94a3b8",
		}))
	}, [stats, sourceLabels, sourceColors])

	const prestationData = useMemo(() => {
		if (!stats) return []
		return Object.entries(stats.byPrestation)
			.sort(([, a], [, b]) => b - a)
			.map(([key, count]) => ({
				name: prestationLabels[key] ?? key,
				count,
				fill: "#6242FB",
			}))
	}, [stats, prestationLabels])

	const montantData = useMemo(() => {
		if (!stats) return []
		return PIPELINE_ORDER.map((statut) => ({
			name: STATUT_LABELS[statut],
			montant: stats.montantByStatut[statut] ?? 0,
			fill: FUNNEL_COLORS[statut],
		}))
	}, [stats])

	const monthlyData = useMemo(() => {
		if (!stats) return []
		return Object.entries(stats.monthlyVolume)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, count]) => {
				const [y, m] = month.split("-")
				const monthNames = [
					"Jan",
					"Fév",
					"Mar",
					"Avr",
					"Mai",
					"Juin",
					"Juil",
					"Août",
					"Sep",
					"Oct",
					"Nov",
					"Déc",
				]
				return { name: `${monthNames[Number(m) - 1]} ${y.slice(2)}`, count }
			})
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
				</div>
			</div>
		)
	}

	const validesCount = (stats.byStatut.valide ?? 0) + (stats.byStatut.onboarding ?? 0)

	return (
		<div>
			<PageHeader title="Acquisition" description="Vue d'ensemble du pipeline commercial" />

			<div className="p-6 space-y-6">
				{/* KPI Row */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<KpiCard
						title="Pipeline actif"
						value={stats.pipelineCount.toString()}
						subtitle={`${formatMontant(stats.montantPipeline)} en cours`}
						icon={Target}
						iconColor="#6242FB"
					/>
					<KpiCard
						title="Valeur pipeline"
						value={stats.totalMontant > 0 ? formatMontant(stats.totalMontant) : "—"}
						subtitle={`${stats.total} lead${stats.total > 1 ? "s" : ""} au total`}
						icon={Euro}
						iconColor="#2E6965"
					/>
					<KpiCard
						title="Conversion"
						value={`${stats.tauxConversion}%`}
						subtitle={`${validesCount} validé${validesCount > 1 ? "s" : ""}`}
						icon={Trophy}
						iconColor="#f59e0b"
					/>
					<KpiCard
						title="Volume mensuel"
						value={
							monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].count.toString() : "0"
						}
						subtitle="Leads ce mois"
						icon={TrendingUp}
						iconColor="#059669"
					/>
				</div>

				{/* Row 2: Funnel + Sources */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Funnel Chart */}
					<Card className="lg:col-span-2">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Funnel par statut</CardTitle>
						</CardHeader>
						<CardContent>
							{funnelIsEmpty ? (
								<div className="flex flex-col items-center justify-center h-[280px] text-sm text-muted-foreground">
									<Target className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucun lead dans le pipeline
								</div>
							) : (
								<div className="h-[280px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={funnelData}
											layout="vertical"
											margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
											barSize={24}
										>
											<CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e8eae6" />
											<XAxis type="number" hide domain={[0, "dataMax + 1"]} />
											<YAxis
												type="category"
												dataKey="name"
												width={110}
												tick={{ fontSize: 11, fill: "#4a6b6a" }}
												axisLine={false}
												tickLine={false}
											/>
											<Tooltip content={ChartTooltip} />
											<Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
												{funnelData.map((entry, idx) => (
													<Cell key={`funnel-${idx}`} fill={entry.fill} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
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
								<div className="flex flex-col items-center justify-center h-[280px] text-sm text-muted-foreground">
									<Users className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucune source renseignée
								</div>
							) : (
								<>
									<ResponsiveContainer width="100%" height={160}>
										<PieChart>
											<Pie
												data={sourceData}
												cx="50%"
												cy="50%"
												innerRadius={40}
												outerRadius={65}
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
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Row 3: Prestations + Monthly volume */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Prestations bar */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Prestations demandées</CardTitle>
						</CardHeader>
						<CardContent>
							{prestationData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[240px] text-sm text-muted-foreground">
									Aucune prestation renseignée
								</div>
							) : (
								<div className="h-[240px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={prestationData}
											margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
										>
											<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8eae6" />
											<XAxis
												dataKey="name"
												tick={{ fontSize: 10, fill: "#4a6b6a" }}
												axisLine={false}
												tickLine={false}
											/>
											<YAxis
												tick={{ fontSize: 11, fill: "#4a6b6a" }}
												axisLine={false}
												tickLine={false}
											/>
											<Tooltip content={ChartTooltip} />
											<Bar
												dataKey="count"
												name="Leads"
												fill="#6242FB"
												radius={[6, 6, 0, 0]}
												barSize={32}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Monthly volume */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Volume mensuel (6 mois)</CardTitle>
						</CardHeader>
						<CardContent>
							{monthlyData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[240px] text-sm text-muted-foreground">
									<TrendingUp className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Pas encore de données
								</div>
							) : (
								<div className="h-[240px]">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart
											data={monthlyData}
											margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
										>
											<CartesianGrid strokeDasharray="3 3" stroke="#e8eae6" />
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
											/>
											<Tooltip content={ChartTooltip} />
											<Line
												type="monotone"
												dataKey="count"
												name="Leads"
												stroke="#2E6965"
												strokeWidth={2}
												dot={{ fill: "#2E6965", r: 4 }}
												activeDot={{ r: 6 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Row 4: Valeur par étape + Derniers leads */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Montant par étape */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Valeur par étape</CardTitle>
						</CardHeader>
						<CardContent>
							{montantIsEmpty ? (
								<div className="flex flex-col items-center justify-center h-[240px] text-sm text-muted-foreground">
									<Euro className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucun montant renseigné
								</div>
							) : (
								<div className="h-[240px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={montantData}
											margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
										>
											<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8eae6" />
											<XAxis
												dataKey="name"
												tick={{ fontSize: 10, fill: "#4a6b6a" }}
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
											<Bar dataKey="montant" name="Montant" radius={[6, 6, 0, 0]} barSize={32}>
												{montantData.map((entry, idx) => (
													<Cell key={`montant-${idx}`} fill={entry.fill} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Derniers leads */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">Derniers leads</CardTitle>
								<Link href="/leads" className="text-xs text-primary hover:underline">
									Voir tout
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							{stats.recent.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[240px] text-sm text-muted-foreground">
									<Users className="h-8 w-8 mb-2 text-muted-foreground/40" />
									Aucun lead
								</div>
							) : (
								<div className="space-y-1">
									{stats.recent.map((lead) => (
										<Link
											key={lead._id}
											href={`/leads/${lead._id}`}
											className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors"
										>
											<div
												className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
												style={{ backgroundColor: FUNNEL_COLORS[lead.statut] ?? "#94a3b8" }}
											>
												{lead.contactNom.charAt(0).toUpperCase()}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{lead.contactNom}</p>
												<p className="text-[11px] text-muted-foreground">
													{lead.entrepriseRaisonSociale && `${lead.entrepriseRaisonSociale} · `}
													{formatDate(lead.createdAt)}
												</p>
											</div>
											<div className="flex flex-col items-end gap-1">
												{lead.montantEstime && (
													<span className="text-xs font-semibold">
														{formatMontant(lead.montantEstime)}
													</span>
												)}
												<Badge
													variant="secondary"
													className={`text-[10px] ${STATUT_BADGE_COLORS[lead.statut] ?? ""}`}
												>
													{STATUT_LABELS[lead.statut] ?? lead.statut}
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
