"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"
import { STATUS_LABELS } from "@/lib/constants"

const PRIORITE_COLORS: Record<string, string> = {
	basse: "bg-gray-100 text-gray-600",
	normale: "bg-blue-100 text-blue-700",
	haute: "bg-orange-100 text-orange-700",
	urgente: "bg-red-100 text-red-700",
}

const PRIORITE_LABELS: Record<string, string> = {
	basse: "Basse",
	normale: "Normale",
	haute: "Haute",
	urgente: "Urgente",
}

export function TicketsTab({ clientId }: { clientId: Id<"clients"> }) {
	const tickets = useQuery(api.tickets.list, { clientId })
	const updateStatus = useMutation(api.tickets.updateStatus)

	if (tickets === undefined) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		)
	}

	if (tickets.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
				<p>Aucun ticket pour ce client.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">Tickets ({tickets.length})</h3>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Titre</TableHead>
							<TableHead>Priorité</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tickets.map((ticket) => (
							<TableRow key={ticket._id}>
								<TableCell className="font-medium">{ticket.titre}</TableCell>
								<TableCell>
									<Badge variant="secondary" className={PRIORITE_COLORS[ticket.priorite] ?? ""}>
										{PRIORITE_LABELS[ticket.priorite] ?? ticket.priorite}
									</Badge>
								</TableCell>
								<TableCell>
									<Select
										value={ticket.status}
										onValueChange={(v) => updateStatus({ id: ticket._id, status: v })}
									>
										<SelectTrigger className="w-28 h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ouvert">Ouvert</SelectItem>
											<SelectItem value="en_cours">En cours</SelectItem>
											<SelectItem value="resolu">Résolu</SelectItem>
											<SelectItem value="ferme">Fermé</SelectItem>
										</SelectContent>
									</Select>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
