"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Building2, Calendar, Euro, User } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Doc } from "@/convex/_generated/dataModel"

const SOURCE_LABELS: Record<string, string> = {
	recommandation: "Recommandation",
	site_web: "Site web",
	formulaire: "Formulaire",
	reseau: "Réseau",
	salon: "Salon",
	parrainage: "Parrainage",
	autre: "Autre",
}

const TYPE_LABELS: Record<string, string> = {
	creation: "Création",
	reprise: "Reprise",
	changement_comptable: "Changement",
	mission_complementaire: "Mission +",
	autre: "Autre",
}

const PRESTATION_LABELS: Record<string, string> = {
	comptabilite: "Compta",
	social_paie: "Social/Paie",
	juridique: "Juridique",
	fiscal: "Fiscal",
	conseil: "Conseil",
	creation_entreprise: "Création",
	audit: "Audit",
	autre: "Autre",
}

const STATUT_COLORS: Record<string, string> = {
	prise_de_contact: "#94a3b8",
	rendez_vous: "#60a5fa",
	qualification: "#8b5cf6",
	go_no_go: "#f59e0b",
	valide: "#2E6965",
	onboarding: "#059669",
	perdu: "#ef4444",
	a_relancer: "#f97316",
}

function formatMontant(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`
	return `${n.toLocaleString("fr-FR")} €`
}

interface KanbanCardProps {
	lead: Doc<"leads">
	index: number
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function KanbanCard({ lead, index, teamMembers }: KanbanCardProps) {
	const responsable = teamMembers?.find((m) => m.userId === lead.responsableId)
	const initials = lead.contactNom
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)

	return (
		<Draggable draggableId={lead._id} index={index}>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					className={`rounded-lg border bg-white p-2.5 shadow-sm transition-all hover:shadow-sm hover:border-primary/20 border-l-[3px] cursor-grab active:cursor-grabbing ${
						snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20 rotate-[2deg]" : ""
					}`}
					style={{
						...provided.draggableProps.style,
						borderLeftColor: STATUT_COLORS[lead.statut] ?? "#94a3b8",
					}}
				>
					{/* Clickable content area — Link only triggers on click, not drag */}
					<Link
						href={`/leads/${lead._id}`}
						onClick={(e) => {
							if (snapshot.isDragging) e.preventDefault()
						}}
						draggable={false}
						className="block"
					>
						{/* Header: Avatar + Name */}
						<div className="flex items-start gap-2">
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v7-emeraude/10 text-[10px] font-bold text-v7-emeraude">
								{initials}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium truncate">{lead.contactNom}</p>
								{lead.entrepriseRaisonSociale && (
									<p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
										<Building2 className="h-2.5 w-2.5 shrink-0" />
										{lead.entrepriseRaisonSociale}
									</p>
								)}
							</div>
						</div>

						{/* Tags row — max 1 prestation */}
						<div className="mt-2 flex flex-wrap gap-0.5">
							{lead.source && (
								<Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
									{SOURCE_LABELS[lead.source] ?? lead.source}
								</Badge>
							)}
							{lead.type && (
								<Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
									{TYPE_LABELS[lead.type] ?? lead.type}
								</Badge>
							)}
							{lead.prestations?.slice(0, 1).map((p) => (
								<Badge
									key={p}
									variant="secondary"
									className="text-[9px] px-1 py-0 h-4 bg-v7-amethyste/10 text-v7-amethyste"
								>
									{PRESTATION_LABELS[p] ?? p}
								</Badge>
							))}
							{(lead.prestations?.length ?? 0) > 1 && (
								<Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
									+{(lead.prestations?.length ?? 0) - 1}
								</Badge>
							)}
						</div>

						{/* Footer: Montant + Responsable + Date */}
						<div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
							<div className="flex items-center gap-1.5">
								{lead.montantEstime && (
									<span className="flex items-center gap-0.5 font-semibold text-foreground">
										<Euro className="h-2.5 w-2.5" />
										{formatMontant(lead.montantEstime)}
									</span>
								)}
								{lead.rdvDate && (
									<span className="flex items-center gap-0.5">
										<Calendar className="h-2.5 w-2.5" />
										{new Date(lead.rdvDate).toLocaleDateString("fr-FR", {
											day: "2-digit",
											month: "short",
										})}
									</span>
								)}
							</div>
							{responsable && (
								<span className="flex items-center gap-0.5 truncate max-w-[60px]">
									<User className="h-2.5 w-2.5 shrink-0" />
									{responsable.nom?.split(" ")[0] ?? "—"}
								</span>
							)}
						</div>
					</Link>
				</div>
			)}
		</Draggable>
	)
}
