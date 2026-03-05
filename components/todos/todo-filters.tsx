"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useTodoCategories } from "@/lib/hooks/use-lead-options"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

type Filters = {
	statut: string
	priorite: string
	assigneId: string
	categorie: string
	search: string
}

export function TodoFilters({
	filters,
	onChange,
}: {
	filters: Filters
	onChange: (filters: Filters) => void
}) {
	const { members } = useTeamMembers()
	const categories = useTodoCategories()

	const hasFilters =
		filters.statut !== "all" ||
		filters.priorite !== "all" ||
		filters.assigneId !== "all" ||
		filters.categorie !== "all" ||
		filters.search !== ""

	function reset() {
		onChange({ statut: "all", priorite: "all", assigneId: "all", categorie: "all", search: "" })
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					placeholder="Rechercher..."
					value={filters.search}
					onChange={(e) => onChange({ ...filters, search: e.target.value })}
					className="h-9 w-48 pl-8 text-sm"
				/>
			</div>

			<Select value={filters.statut} onValueChange={(v) => onChange({ ...filters, statut: v })}>
				<SelectTrigger className="w-36 h-9">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Tous les statuts</SelectItem>
					<SelectItem value="a_faire">À faire</SelectItem>
					<SelectItem value="en_cours">En cours</SelectItem>
					<SelectItem value="termine">Terminé</SelectItem>
					<SelectItem value="archive">Archivé</SelectItem>
				</SelectContent>
			</Select>

			<Select value={filters.priorite} onValueChange={(v) => onChange({ ...filters, priorite: v })}>
				<SelectTrigger className="w-36 h-9">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Toutes priorités</SelectItem>
					<SelectItem value="basse">Basse</SelectItem>
					<SelectItem value="normale">Normale</SelectItem>
					<SelectItem value="haute">Haute</SelectItem>
					<SelectItem value="urgente">Urgente</SelectItem>
				</SelectContent>
			</Select>

			<Select
				value={filters.assigneId}
				onValueChange={(v) => onChange({ ...filters, assigneId: v })}
			>
				<SelectTrigger className="w-44 h-9">
					<SelectValue placeholder="Tous les assignés" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Tous les assignés</SelectItem>
					<SelectItem value="unassigned">Non assigné</SelectItem>
					{members?.map((m) => (
						<SelectItem key={m.userId} value={m.userId}>
							{m.nom ?? m.userId}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{categories && categories.length > 0 && (
				<Select
					value={filters.categorie}
					onValueChange={(v) => onChange({ ...filters, categorie: v })}
				>
					<SelectTrigger className="w-40 h-9">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Toutes catégories</SelectItem>
						{categories.map((cat) => (
							<SelectItem key={cat._id} value={cat.value}>
								{cat.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{hasFilters && (
				<Button variant="ghost" size="sm" onClick={reset} className="h-9 gap-1 text-xs">
					<X className="h-3 w-3" />
					Réinitialiser
				</Button>
			)}
		</div>
	)
}
