"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { STATUS_LABELS } from "@/lib/constants"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const _CATEGORIE_COLORS: Record<string, string> = {
	IR: "bg-blue-100 text-blue-800",
	IS: "bg-purple-100 text-purple-800",
	TVA: "bg-orange-100 text-orange-800",
	TAXES: "bg-red-100 text-red-800",
	AUTRE: "bg-gray-100 text-gray-800",
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "—"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
	if (!value) return null
	return (
		<div className="flex justify-between py-1.5">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	)
}

export default function TacheDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const tache = useQuery(api.taches.getById, { id: id as Id<"taches"> })
	const updateStatus = useMutation(api.taches.updateStatus)
	const updateTache = useMutation(api.taches.update)
	const deleteTache = useMutation(api.taches.remove)
	const { members } = useTeamMembers()

	const isAdmin = userRole === "admin"

	if (tache === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (tache === null) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-lg">Tâche non trouvée</p>
				<Button variant="outline" className="mt-4" onClick={() => router.push("/taches")}>
					Retour aux tâches
				</Button>
			</div>
		)
	}

	const isOverdue =
		tache.dateEcheance && tache.dateEcheance < Date.now() && tache.status !== "termine"

	type TacheStatus = "a_venir" | "en_cours" | "en_attente" | "termine"
	async function handleStatusChange(newStatus: string) {
		try {
			await updateStatus({ id: id as Id<"taches">, status: newStatus as TacheStatus })
			toast.success("Status mis à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleAssignChange(assigneId: string) {
		try {
			await updateTache({
				id: id as Id<"taches">,
				assigneId: assigneId === "unassigned" ? undefined : assigneId,
			})
			toast.success("Assigné mis à jour")
		} catch {
			toast.error("Erreur lors de l'assignation")
		}
	}

	async function handleDelete() {
		try {
			await deleteTache({ id: id as Id<"taches"> })
			toast.success("Tâche supprimée")
			router.push("/taches")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title={tache.nom}
				description={`${tache.clientName} — Exercice ${tache.run?.exercice ?? ""}`}
				actions={
					<div className="flex gap-2 items-center">
						<Button variant="ghost" size="sm" onClick={() => router.back()}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Retour
						</Button>

						<Select value={tache.status} onValueChange={handleStatusChange}>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="a_venir">À venir</SelectItem>
								<SelectItem value="en_cours">En cours</SelectItem>
								<SelectItem value="en_attente">En attente</SelectItem>
								<SelectItem value="termine">Terminé</SelectItem>
							</SelectContent>
						</Select>

						{isAdmin && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm">
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
										<AlertDialogDescription>
											La tâche sera définitivement supprimée.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Annuler</AlertDialogCancel>
										<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</div>
				}
			/>

			<div className="p-6 max-w-2xl">
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							Détails
							{isOverdue && <Badge variant="destructive">En retard</Badge>}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0">
						<InfoRow label="Nom" value={tache.nom} />
						<InfoRow label="Type" value={tache.type === "fiscale" ? "Fiscale" : "Opérationnelle"} />
						<InfoRow label="Catégorie" value={tache.categorie} />
						<InfoRow label="Cerfa" value={tache.cerfa} />
						<InfoRow label="Échéance" value={formatDate(tache.dateEcheance)} />
						<InfoRow label="Status" value={STATUS_LABELS[tache.status] ?? tache.status} />
						<InfoRow label="Client" value={tache.clientName} />
						<InfoRow label="Run" value={tache.run ? `Exercice ${tache.run.exercice}` : undefined} />
						<div className="flex justify-between items-center py-1.5">
							<span className="text-sm text-muted-foreground">Assigné à</span>
							<Select value={tache.assigneId ?? "unassigned"} onValueChange={handleAssignChange}>
								<SelectTrigger className="w-44">
									<SelectValue placeholder="Non assigné" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="unassigned">Non assigné</SelectItem>
									{members?.map((m) => (
										<SelectItem key={m.userId} value={m.userId}>
											{m.nom ?? m.userId}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{tache.completedAt && (
							<InfoRow label="Complétée le" value={formatDate(tache.completedAt)} />
						)}
						{tache.notes && (
							<div className="pt-3">
								<span className="text-sm text-muted-foreground">Notes</span>
								<p className="text-sm mt-1 whitespace-pre-wrap">{tache.notes}</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Quick navigation */}
				<div className="flex gap-2 mt-4 flex-wrap">
					{tache.run && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => router.push(`/runs/${tache.run?._id}`)}
						>
							Voir le run
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/clients/${tache.clientId}`)}
					>
						Voir le client
					</Button>
					{tache.sopId && (
						<Button variant="outline" size="sm" onClick={() => router.push(`/sops/${tache.sopId}`)}>
							Voir la SOP
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
