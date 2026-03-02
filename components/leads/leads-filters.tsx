"use client"

import { Search, X } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useSources, useTypes } from "@/lib/hooks/use-lead-options"

const STATUT_OPTIONS = [
	{ value: "all", label: "Tous les statuts" },
	{ value: "prise_de_contact", label: "Prise de contact" },
	{ value: "rendez_vous", label: "Rendez-vous" },
	{ value: "qualification", label: "Qualification" },
	{ value: "go_no_go", label: "Go / No Go" },
	{ value: "valide", label: "Validé" },
	{ value: "onboarding", label: "Onboarding" },
	{ value: "perdu", label: "Perdu" },
	{ value: "a_relancer", label: "À relancer" },
]

export interface LeadFilters {
	search: string
	statut: string
	source: string
	type: string
	responsableId: string
}

interface LeadsFiltersProps {
	filters: LeadFilters
	onChange: (filters: LeadFilters) => void
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function LeadsFilters({ filters, onChange, teamMembers }: LeadsFiltersProps) {
	const sources = useSources()
	const types = useTypes()

	const sourceOptions = useMemo(
		() => [
			{ value: "all", label: "Toutes les sources" },
			...(sources?.map((s) => ({ value: s.value, label: s.label })) ?? []),
		],
		[sources],
	)

	const typeOptions = useMemo(
		() => [
			{ value: "all", label: "Tous les types" },
			...(types?.map((t) => ({ value: t.value, label: t.label })) ?? []),
		],
		[types],
	)

	const hasActiveFilters =
		filters.search ||
		filters.statut !== "all" ||
		filters.source !== "all" ||
		filters.type !== "all" ||
		filters.responsableId !== "all"

	const clearFilters = () =>
		onChange({
			search: "",
			statut: "all",
			source: "all",
			type: "all",
			responsableId: "all",
		})

	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					placeholder="Rechercher..."
					value={filters.search}
					onChange={(e) => onChange({ ...filters, search: e.target.value })}
					className="h-8 w-[180px] pl-8 text-xs"
				/>
			</div>

			{/* Statut */}
			<Select value={filters.statut} onValueChange={(v) => onChange({ ...filters, statut: v })}>
				<SelectTrigger className="h-8 w-[150px] text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUT_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Source */}
			<Select value={filters.source} onValueChange={(v) => onChange({ ...filters, source: v })}>
				<SelectTrigger className="h-8 w-[150px] text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{sourceOptions.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Type */}
			<Select value={filters.type} onValueChange={(v) => onChange({ ...filters, type: v })}>
				<SelectTrigger className="h-8 w-[130px] text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{typeOptions.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Responsable */}
			{teamMembers && teamMembers.length > 0 && (
				<Select
					value={filters.responsableId}
					onValueChange={(v) => onChange({ ...filters, responsableId: v })}
				>
					<SelectTrigger className="h-8 w-[140px] text-xs">
						<SelectValue placeholder="Responsable" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous</SelectItem>
						{teamMembers.map((m) => (
							<SelectItem key={m.userId} value={m.userId}>
								{m.nom ?? m.userId}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{/* Clear */}
			{hasActiveFilters && (
				<Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
					<X className="h-3 w-3" />
					Réinitialiser
				</Button>
			)}
		</div>
	)
}
