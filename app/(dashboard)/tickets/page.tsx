"use client"

import { useMutation, useQuery } from "convex/react"
import { AlertTriangle, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

const _STATUS_COLORS: Record<string, string> = {
	ouvert: "bg-blue-100 text-blue-800",
	en_cours: "bg-amber-100 text-amber-800",
	resolu: "bg-green-100 text-green-800",
	ferme: "bg-gray-100 text-gray-800",
}

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

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

export default function TicketsPage() {
	const [statusFilter, setStatusFilter] = useState<string>("all")

	const tickets = useQuery(api.tickets.list, {
		status: statusFilter === "all" ? undefined : statusFilter,
	})
	const clients = useQuery(api.clients.list, { status: "actif" })
	const createTicket = useMutation(api.tickets.create)
	const updateTicketStatus = useMutation(api.tickets.updateStatus)

	const [open, setOpen] = useState(false)
	const [selectedClient, setSelectedClient] = useState<string>("")
	const [selectedPriorite, setSelectedPriorite] = useState<string>("normale")

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const form = new FormData(e.currentTarget)

		if (!selectedClient) {
			toast.error("Client obligatoire")
			return
		}

		try {
			await createTicket({
				clientId: selectedClient as Id<"clients">,
				titre: form.get("titre") as string,
				description: (form.get("description") as string) || undefined,
				priorite: selectedPriorite,
			})
			toast.success("Ticket créé")
			setOpen(false)
			setSelectedClient("")
			setSelectedPriorite("normale")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title="Tickets"
				description="Anomalies, exceptions et demandes clients"
				actions={
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Nouveau ticket
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Nouveau ticket</DialogTitle>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4">
								<div>
									<Label>Client *</Label>
									<Select value={selectedClient} onValueChange={setSelectedClient}>
										<SelectTrigger>
											<SelectValue placeholder="Sélectionner un client" />
										</SelectTrigger>
										<SelectContent>
											{clients?.map((c) => (
												<SelectItem key={c._id} value={c._id}>
													{c.raisonSociale}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="titre">Titre *</Label>
									<Input id="titre" name="titre" required />
								</div>
								<div>
									<Label>Priorité</Label>
									<Select value={selectedPriorite} onValueChange={setSelectedPriorite}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="basse">Basse</SelectItem>
											<SelectItem value="normale">Normale</SelectItem>
											<SelectItem value="haute">Haute</SelectItem>
											<SelectItem value="urgente">Urgente</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="description">Description</Label>
									<Textarea id="description" name="description" rows={3} />
								</div>
								<Button type="submit" className="w-full">
									Créer le ticket
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			<div className="flex items-center gap-3 px-6 py-4">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous</SelectItem>
						<SelectItem value="ouvert">Ouvert</SelectItem>
						<SelectItem value="en_cours">En cours</SelectItem>
						<SelectItem value="resolu">Résolu</SelectItem>
						<SelectItem value="ferme">Fermé</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="px-6">
				{tickets === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : tickets.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucun ticket</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Titre</TableHead>
									<TableHead className="hidden md:table-cell">Client</TableHead>
									<TableHead>Priorité</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">Créé le</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tickets.map((ticket) => (
									<TableRow key={ticket._id}>
										<TableCell className="font-medium">{ticket.titre}</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{ticket.clientName}
										</TableCell>
										<TableCell>
											<Badge variant="secondary" className={PRIORITE_COLORS[ticket.priorite] ?? ""}>
												{PRIORITE_LABELS[ticket.priorite] ?? ticket.priorite}
											</Badge>
										</TableCell>
										<TableCell>
											<Select
												value={ticket.status}
												onValueChange={(v) => updateTicketStatus({ id: ticket._id, status: v })}
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
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{formatDate(ticket.createdAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	)
}
