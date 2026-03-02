"use client"

import { useParams } from "next/navigation"
import { LeadActionsBar } from "@/components/leads/lead-actions-bar"
import { LeadInfoCard } from "@/components/leads/lead-info-card"
import { LeadRdvSection } from "@/components/leads/lead-rdv-section"
import { OnboardingChecklist } from "@/components/leads/onboarding-checklist"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Id } from "@/convex/_generated/dataModel"
import { usePrestationLabels, useSourceLabels, useTypeLabels } from "@/lib/hooks/use-lead-options"
import { useLead } from "@/lib/hooks/use-leads"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

function formatMontant(n: number): string {
	return `${n.toLocaleString("fr-FR")} €`
}

export default function LeadDetailPage() {
	const params = useParams()
	const leadId = params.id as Id<"leads">
	const lead = useLead(leadId)
	const { members } = useTeamMembers()
	const sourceLabels = useSourceLabels()
	const typeLabels = useTypeLabels()
	const prestationLabels = usePrestationLabels()

	const teamMembers = members?.map((m) => ({ userId: m.userId, nom: m.nom }))
	const responsable = teamMembers?.find((m) => m.userId === lead?.responsableId)

	if (lead === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-10 w-full" />
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						<Skeleton className="h-48" />
						<Skeleton className="h-32" />
					</div>
					<div className="space-y-4">
						<Skeleton className="h-40" />
						<Skeleton className="h-60" />
					</div>
				</div>
			</div>
		)
	}

	if (lead === null) {
		return (
			<div className="flex items-center justify-center h-[50vh]">
				<p className="text-muted-foreground">Lead introuvable</p>
			</div>
		)
	}

	const showOnboarding = ["valide", "onboarding"].includes(lead.statut)

	return (
		<div className="space-y-4">
			{/* Actions bar */}
			<div className="border-b bg-white px-6 py-3">
				<LeadActionsBar lead={lead} />
			</div>

			{/* Content: 2/3 + 1/3 layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 pb-6">
				{/* Left: 2/3 — Contact, Entreprise, RDV, Notes */}
				<div className="lg:col-span-2 space-y-4">
					<LeadInfoCard lead={lead} />
					<LeadRdvSection lead={lead} />
				</div>

				{/* Right: 1/3 — Pipeline info + Onboarding */}
				<div className="space-y-4">
					{/* Pipeline info */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Informations pipeline</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{lead.source && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Source</span>
									<span className="font-medium">{sourceLabels[lead.source] ?? lead.source}</span>
								</div>
							)}
							{lead.sourceDetail && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Détail source</span>
									<span className="text-xs">{lead.sourceDetail}</span>
								</div>
							)}
							{lead.type && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Type</span>
									<span className="font-medium">{typeLabels[lead.type] ?? lead.type}</span>
								</div>
							)}
							{lead.montantEstime != null && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Montant estimé</span>
									<span className="font-semibold">{formatMontant(lead.montantEstime)}</span>
								</div>
							)}
							{responsable && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Responsable</span>
									<span className="font-medium">{responsable.nom ?? "—"}</span>
								</div>
							)}
							{lead.prestations && lead.prestations.length > 0 && (
								<div>
									<span className="text-muted-foreground text-xs">Prestations</span>
									<div className="flex flex-wrap gap-1 mt-1">
										{lead.prestations.map((p) => (
											<Badge key={p} variant="secondary" className="text-[10px]">
												{prestationLabels[p] ?? p}
											</Badge>
										))}
									</div>
								</div>
							)}
							{lead.raisonPerte && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Raison perte</span>
									<span className="text-xs text-destructive">{lead.raisonPerte}</span>
								</div>
							)}
							<div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
								<span>Créé le</span>
								<span>
									{new Date(lead.createdAt).toLocaleDateString("fr-FR", {
										day: "numeric",
										month: "long",
										year: "numeric",
									})}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Onboarding checklist */}
					{showOnboarding && <OnboardingChecklist leadId={lead._id} teamMembers={teamMembers} />}
				</div>
			</div>
		</div>
	)
}
