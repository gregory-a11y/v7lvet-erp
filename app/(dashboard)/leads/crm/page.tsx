"use client"

import { Euro, Target, TrendingUp, Trophy } from "lucide-react"
import { useState } from "react"
import { type LeadFilters, LeadsFilters } from "@/components/leads/leads-filters"
import { LeadsTable } from "@/components/leads/leads-table"
import { NewLeadDialog } from "@/components/leads/new-lead-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { useLeadStats, useLeads } from "@/lib/hooks/use-leads"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

function formatMontant(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`
	return `${n.toLocaleString("fr-FR")} €`
}

export default function CrmPage() {
	const [filters, setFilters] = useState<LeadFilters>({
		search: "",
		statut: "all",
		source: "all",
		type: "all",
		responsableId: "all",
	})

	const { members } = useTeamMembers()
	const leads = useLeads()
	const stats = useLeadStats()
	const teamMembers = members?.map((m) => ({ userId: m.userId, nom: m.nom }))

	const pipelineActif = stats
		? stats.total - (stats.byStatut?.perdu ?? 0) - (stats.byStatut?.onboarding ?? 0)
		: 0
	const tauxConversion =
		stats && stats.total > 0
			? Math.round(
					(((stats.byStatut?.valide ?? 0) + (stats.byStatut?.onboarding ?? 0)) / stats.total) * 100,
				)
			: 0

	const kpis = [
		{
			label: "Total leads",
			value: stats?.total ?? 0,
			icon: Target,
			color: "text-blue-600",
			bg: "bg-blue-50",
		},
		{
			label: "Pipeline actif",
			value: pipelineActif,
			icon: TrendingUp,
			color: "text-emerald-600",
			bg: "bg-emerald-50",
		},
		{
			label: "Taux conversion",
			value: `${tauxConversion}%`,
			icon: Trophy,
			color: "text-amber-600",
			bg: "bg-amber-50",
		},
		{
			label: "Montant pipeline",
			value: formatMontant(stats?.totalMontant ?? 0),
			icon: Euro,
			color: "text-violet-600",
			bg: "bg-violet-50",
		},
	]

	return (
		<div className="flex flex-col h-full">
			<PageHeader
				title="CRM"
				description="Vue d'ensemble et gestion des leads"
				actions={<NewLeadDialog teamMembers={teamMembers} />}
			/>

			<div className="px-6 pt-4 space-y-4">
				<div className="grid grid-cols-4 gap-4">
					{kpis.map((kpi) => (
						<Card key={kpi.label} className="border-0 shadow-sm">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
										<p className="text-2xl font-bold mt-1">{kpi.value}</p>
									</div>
									<div className={`${kpi.bg} ${kpi.color} p-2.5 rounded-lg`}>
										<kpi.icon className="h-5 w-5" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<LeadsFilters filters={filters} onChange={setFilters} teamMembers={teamMembers} />
				<LeadsTable leads={leads ?? []} filters={filters} teamMembers={teamMembers} />
			</div>
		</div>
	)
}
