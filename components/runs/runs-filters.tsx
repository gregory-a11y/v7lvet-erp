"use client"

import { useQuery } from "convex/react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"

export interface RunsFilters {
	exercice: string
	status: string
	clientId: string
	categorie: string
}

interface RunsFiltersBarProps {
	filters: RunsFilters
	onChange: (filters: RunsFilters) => void
}

const currentYear = new Date().getFullYear()
const EXERCICE_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)

export function RunsFiltersBar({ filters, onChange }: RunsFiltersBarProps) {
	const clients = useQuery(api.clients.list, { status: "actif" })

	const update = (key: keyof RunsFilters, value: string) => {
		onChange({ ...filters, [key]: value })
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Select value={filters.exercice} onValueChange={(v) => update("exercice", v)}>
				<SelectTrigger className="w-32">
					<SelectValue placeholder="Exercice" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Tous</SelectItem>
					{EXERCICE_OPTIONS.map((y) => (
						<SelectItem key={y} value={String(y)}>
							{y}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select value={filters.status} onValueChange={(v) => update("status", v)}>
				<SelectTrigger className="w-32">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Tous</SelectItem>
					<SelectItem value="a_venir">À venir</SelectItem>
					<SelectItem value="en_cours">En cours</SelectItem>
					<SelectItem value="en_attente">En attente</SelectItem>
					<SelectItem value="termine">Terminé</SelectItem>
				</SelectContent>
			</Select>

			<Select value={filters.clientId} onValueChange={(v) => update("clientId", v)}>
				<SelectTrigger className="w-44">
					<SelectValue placeholder="Client" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Tous les clients</SelectItem>
					{clients?.map((c) => (
						<SelectItem key={c._id} value={c._id}>
							{c.raisonSociale}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select value={filters.categorie} onValueChange={(v) => update("categorie", v)}>
				<SelectTrigger className="w-32">
					<SelectValue placeholder="Catégorie" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Toutes</SelectItem>
					<SelectItem value="IR">IR</SelectItem>
					<SelectItem value="IS">IS</SelectItem>
					<SelectItem value="TVA">TVA</SelectItem>
					<SelectItem value="TAXES">TAXES</SelectItem>
					<SelectItem value="CFE">CFE</SelectItem>
					<SelectItem value="CVAE">CVAE</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
