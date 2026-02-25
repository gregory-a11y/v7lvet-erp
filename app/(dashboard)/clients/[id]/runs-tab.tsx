"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
import { Calendar } from "lucide-react"
import { STATUS_LABELS } from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

export function RunsTab({ clientId }: { clientId: Id<"clients"> }) {
	const router = useRouter()
	const runs = useQuery(api.runs.listByClient, { clientId })

	if (runs === undefined) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		)
	}

	if (runs.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
				<p>Aucun run pour ce client.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">Runs ({runs.length})</h3>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Exercice</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Progression</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{runs.map((run) => {
							const pct = run.tachesTotal > 0 ? Math.round((run.tachesDone / run.tachesTotal) * 100) : 0
							return (
								<TableRow
									key={run._id}
									className="cursor-pointer"
									onClick={() => router.push(`/runs/${run._id}`)}
								>
									<TableCell className="font-medium">{run.exercice}</TableCell>
									<TableCell>
										<Badge variant="secondary" className={STATUS_COLORS[run.status] ?? ""}>
											{STATUS_LABELS[run.status] ?? run.status}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-emerald-600 rounded-full"
													style={{ width: `${pct}%` }}
												/>
											</div>
											<span className="text-xs text-muted-foreground">
												{run.tachesDone}/{run.tachesTotal}
											</span>
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
