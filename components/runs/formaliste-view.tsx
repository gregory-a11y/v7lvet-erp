"use client"

import { Calendar } from "lucide-react"
import { useMemo, useState } from "react"
import { ClientSheet } from "@/components/runs/client-sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Id } from "@/convex/_generated/dataModel"
import { STATUS_LABELS } from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

interface Run {
	_id: Id<"runs">
	clientId: Id<"clients">
	clientName: string
	exercice: number
	status: string
	tachesTotal: number
	tachesDone: number
}

interface FormalisteViewProps {
	runs: Run[] | undefined
}

interface ClientGroup {
	clientId: Id<"clients">
	clientName: string
	exercices: number[]
	worstStatus: string
	totalDone: number
	totalTaches: number
}

function getWorstStatus(statuses: string[]): string {
	if (statuses.includes("en_attente")) return "en_attente"
	if (statuses.includes("en_cours")) return "en_cours"
	if (statuses.includes("a_venir")) return "a_venir"
	return "termine"
}

export function FormalisteView({ runs }: FormalisteViewProps) {
	const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null)

	const clientGroups = useMemo(() => {
		if (!runs) return []
		const map = new Map<string, ClientGroup>()

		for (const run of runs) {
			const existing = map.get(run.clientId)
			if (existing) {
				if (!existing.exercices.includes(run.exercice)) {
					existing.exercices.push(run.exercice)
				}
				existing.totalDone += run.tachesDone
				existing.totalTaches += run.tachesTotal
				existing.worstStatus = getWorstStatus([existing.worstStatus, run.status])
			} else {
				map.set(run.clientId, {
					clientId: run.clientId,
					clientName: run.clientName,
					exercices: [run.exercice],
					worstStatus: run.status,
					totalDone: run.tachesDone,
					totalTaches: run.tachesTotal,
				})
			}
		}

		return [...map.values()].sort((a, b) => a.clientName.localeCompare(b.clientName))
	}, [runs])

	if (runs === undefined) {
		return (
			<div className="space-y-3 px-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		)
	}

	if (clientGroups.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
				<p className="text-lg font-medium">Aucun run</p>
				<p className="text-sm text-muted-foreground mt-1">
					Créez un exercice fiscal pour un client.
				</p>
			</div>
		)
	}

	return (
		<>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Client</TableHead>
							<TableHead>Exercice(s)</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="hidden md:table-cell">Progression</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{clientGroups.map((group) => {
							const pct =
								group.totalTaches > 0 ? Math.round((group.totalDone / group.totalTaches) * 100) : 0
							return (
								<TableRow
									key={group.clientId}
									className="cursor-pointer"
									onClick={() => setSelectedClientId(group.clientId)}
								>
									<TableCell className="font-medium">{group.clientName}</TableCell>
									<TableCell>{group.exercices.sort().join(", ")}</TableCell>
									<TableCell>
										<Badge variant="secondary" className={STATUS_COLORS[group.worstStatus] ?? ""}>
											{STATUS_LABELS[group.worstStatus] ?? group.worstStatus}
										</Badge>
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<div className="flex items-center gap-2">
											<div className="h-2 w-24 rounded-full bg-gray-200">
												<div
													className="h-2 rounded-full bg-primary transition-all"
													style={{ width: `${pct}%` }}
												/>
											</div>
											<span className="text-xs text-muted-foreground">
												{group.totalDone}/{group.totalTaches}
											</span>
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			<ClientSheet clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
		</>
	)
}
