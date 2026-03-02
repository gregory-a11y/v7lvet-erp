"use client"

import { Building2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Doc } from "@/convex/_generated/dataModel"
import { useSourceLabels, useTypeLabels } from "@/lib/hooks/use-lead-options"
import type { LeadFilters } from "./leads-filters"

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

const STATUT_COLORS: Record<string, string> = {
	prise_de_contact: "bg-gray-100 text-gray-700",
	rendez_vous: "bg-blue-50 text-blue-700",
	qualification: "bg-violet-50 text-violet-700",
	go_no_go: "bg-amber-50 text-amber-700",
	valide: "bg-emerald-50 text-emerald-700",
	onboarding: "bg-green-50 text-green-700",
	perdu: "bg-red-50 text-red-700",
	a_relancer: "bg-orange-50 text-orange-700",
}

const STATUT_DOT_COLORS: Record<string, string> = {
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

type SortField = "contactNom" | "statut" | "source" | "montantEstime" | "createdAt"
type SortDir = "asc" | "desc"

interface LeadsTableProps {
	leads: Doc<"leads">[]
	filters: LeadFilters
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function LeadsTable({ leads, filters, teamMembers }: LeadsTableProps) {
	const sourceLabels = useSourceLabels()
	const typeLabels = useTypeLabels()
	const [sortField, setSortField] = useState<SortField>("createdAt")
	const [sortDir, setSortDir] = useState<SortDir>("desc")

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"))
		} else {
			setSortField(field)
			setSortDir("asc")
		}
	}

	const filtered = useMemo(() => {
		let result = [...leads]

		if (filters.search) {
			const q = filters.search.toLowerCase()
			result = result.filter(
				(l) =>
					l.contactNom.toLowerCase().includes(q) ||
					l.entrepriseRaisonSociale?.toLowerCase().includes(q) ||
					l.contactEmail?.toLowerCase().includes(q),
			)
		}
		if (filters.statut !== "all") {
			result = result.filter((l) => l.statut === filters.statut)
		}
		if (filters.source !== "all") {
			result = result.filter((l) => l.source === filters.source)
		}
		if (filters.type !== "all") {
			result = result.filter((l) => l.type === filters.type)
		}
		if (filters.responsableId !== "all") {
			result = result.filter((l) => l.responsableId === filters.responsableId)
		}

		// Sort
		result.sort((a, b) => {
			let cmp = 0
			switch (sortField) {
				case "contactNom":
					cmp = a.contactNom.localeCompare(b.contactNom)
					break
				case "statut":
					cmp = a.statut.localeCompare(b.statut)
					break
				case "source":
					cmp = (a.source ?? "").localeCompare(b.source ?? "")
					break
				case "montantEstime":
					cmp = (a.montantEstime ?? 0) - (b.montantEstime ?? 0)
					break
				case "createdAt":
					cmp = a.createdAt - b.createdAt
					break
			}
			return sortDir === "asc" ? cmp : -cmp
		})

		return result
	}, [leads, filters, sortField, sortDir])

	const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
		<TableHead
			className="cursor-pointer select-none hover:bg-muted/40 text-xs"
			onClick={() => toggleSort(field)}
		>
			<span className="flex items-center gap-1">
				{children}
				{sortField === field && (
					<span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
				)}
			</span>
		</TableHead>
	)

	return (
		<div className="rounded-lg border bg-white">
			<Table>
				<TableHeader>
					<TableRow>
						<SortableHeader field="contactNom">Contact</SortableHeader>
						<TableHead className="text-xs">Entreprise</TableHead>
						<SortableHeader field="statut">Statut</SortableHeader>
						<TableHead className="text-xs">Type</TableHead>
						<SortableHeader field="source">Source</SortableHeader>
						<TableHead className="text-xs">Prestations</TableHead>
						<SortableHeader field="montantEstime">Montant</SortableHeader>
						<TableHead className="text-xs">Responsable</TableHead>
						<SortableHeader field="createdAt">Créé le</SortableHeader>
						<TableHead className="text-xs w-10" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{filtered.length === 0 ? (
						<TableRow>
							<TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
								Aucun lead trouvé
							</TableCell>
						</TableRow>
					) : (
						filtered.map((lead) => {
							const responsable = teamMembers?.find((m) => m.userId === lead.responsableId)
							return (
								<TableRow key={lead._id} className="hover:bg-muted/30 even:bg-muted/20">
									<TableCell>
										<div>
											<p className="text-sm font-medium">
												{lead.contactNom}
												{lead.contactPrenom && ` ${lead.contactPrenom}`}
											</p>
											{lead.contactEmail && (
												<p className="text-[11px] text-muted-foreground">{lead.contactEmail}</p>
											)}
										</div>
									</TableCell>
									<TableCell>
										{lead.entrepriseRaisonSociale ? (
											<span className="flex items-center gap-1 text-xs">
												<Building2 className="h-3 w-3 text-muted-foreground" />
												{lead.entrepriseRaisonSociale}
											</span>
										) : (
											<span className="text-xs text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={`text-[10px] gap-1 ${STATUT_COLORS[lead.statut] ?? ""}`}
										>
											<span
												className="h-1.5 w-1.5 rounded-full shrink-0"
												style={{ backgroundColor: STATUT_DOT_COLORS[lead.statut] ?? "#94a3b8" }}
											/>
											{STATUT_LABELS[lead.statut] ?? lead.statut}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">
										{lead.type ? (typeLabels[lead.type] ?? lead.type) : "—"}
									</TableCell>
									<TableCell className="text-xs">
										{lead.source ? (sourceLabels[lead.source] ?? lead.source) : "—"}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-0.5">
											{lead.prestations?.slice(0, 2).map((p) => (
												<Badge key={p} variant="outline" className="text-[9px] px-1 py-0">
													{p}
												</Badge>
											))}
											{(lead.prestations?.length ?? 0) > 2 && (
												<Badge variant="outline" className="text-[9px] px-1 py-0">
													+{(lead.prestations?.length ?? 0) - 2}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="text-xs font-medium text-right">
										{lead.montantEstime ? formatMontant(lead.montantEstime) : "—"}
									</TableCell>
									<TableCell className="text-xs">
										{responsable?.nom?.split(" ")[0] ?? "—"}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{new Date(lead.createdAt).toLocaleDateString("fr-FR", {
											day: "2-digit",
											month: "short",
											year: "2-digit",
										})}
									</TableCell>
									<TableCell>
										<Link href={`/leads/${lead._id}`}>
											<Button variant="ghost" size="icon" className="h-7 w-7">
												<ExternalLink className="h-3.5 w-3.5" />
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							)
						})
					)}
				</TableBody>
			</Table>
		</div>
	)
}
