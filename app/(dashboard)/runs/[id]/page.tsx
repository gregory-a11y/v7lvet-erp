"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useState } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { DocumentsTab } from "./documents-tab"
import { GatesTab } from "./gates-tab"

const _STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

const CATEGORIE_COLORS: Record<string, string> = {
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
		month: "short",
		year: "numeric",
	})
}

function isOverdue(dateEcheance: number | undefined, status: string): boolean {
	if (!dateEcheance || status === "termine") return false
	return dateEcheance < Date.now()
}

function isUpcoming(dateEcheance: number | undefined, status: string): boolean {
	if (!dateEcheance || status === "termine") return false
	const threeDays = 3 * 86400000
	return dateEcheance > Date.now() && dateEcheance < Date.now() + threeDays
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const run = useQuery(api.runs.getById, { id: id as Id<"runs"> })
	const updateRun = useMutation(api.runs.update)
	const regenerate = useMutation(api.runs.regenerateTasks)
	const deleteRun = useMutation(api.runs.remove)
	const updateTaskStatus = useMutation(api.taches.updateStatus)
	const applyTemplate = useMutation(api.tacheTemplates.applyToRun)
	const tacheTemplates = useQuery(api.tacheTemplates.list, {})

	const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
	const [selectedTemplateId, setSelectedTemplateId] = useState("")
	const [applyingTemplate, setApplyingTemplate] = useState(false)

	const isAdmin = userRole === "admin"

	async function handleApplyTemplate(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedTemplateId || !run) return
		setApplyingTemplate(true)
		try {
			await applyTemplate({
				templateId: selectedTemplateId as Id<"tacheTemplates">,
				runId: id as Id<"runs">,
				clientId: run.clientId,
			})
			toast.success("Tâche ajoutée depuis le template")
			setTemplateDialogOpen(false)
			setSelectedTemplateId("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setApplyingTemplate(false)
		}
	}

	if (run === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (run === null) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-lg">Run non trouvé</p>
				<Button variant="outline" className="mt-4" onClick={() => router.push("/runs")}>
					Retour aux runs
				</Button>
			</div>
		)
	}

	type RunStatus = "a_venir" | "en_cours" | "en_attente" | "termine"
	async function handleStatusChange(newStatus: string) {
		try {
			await updateRun({ id: id as Id<"runs">, status: newStatus as RunStatus })
			toast.success("Status mis à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleRegenerate() {
		try {
			await regenerate({ id: id as Id<"runs"> })
			toast.success("Tâches fiscales régénérées")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleDelete() {
		try {
			await deleteRun({ id: id as Id<"runs"> })
			toast.success("Run supprimé")
			router.push("/runs")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	type TacheStatus = "a_venir" | "en_cours" | "en_attente" | "termine"
	async function handleTaskStatusChange(taskId: string, newStatus: string) {
		try {
			await updateTaskStatus({ id: taskId as Id<"taches">, status: newStatus as TacheStatus })
		} catch {
			toast.error("Erreur")
		}
	}

	const progressPct = run.tachesTotal > 0 ? Math.round((run.tachesDone / run.tachesTotal) * 100) : 0

	return (
		<div>
			<PageHeader
				title={`${run.clientName} — Exercice ${run.exercice}`}
				description={`${run.tachesDone}/${run.tachesTotal} tâches terminées (${progressPct}%)`}
				actions={
					<div className="flex gap-2 items-center">
						<Button variant="ghost" size="sm" onClick={() => router.push("/runs")}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Retour
						</Button>

						<Select value={run.status} onValueChange={handleStatusChange}>
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
							<>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="outline" size="sm">
											<RefreshCw className="mr-2 h-4 w-4" />
											Régénérer
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Régénérer les tâches fiscales ?</AlertDialogTitle>
											<AlertDialogDescription>
												Les tâches fiscales existantes seront supprimées et recalculées avec les
												données client actuelles. Les tâches opérationnelles seront conservées.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Annuler</AlertDialogCancel>
											<AlertDialogAction onClick={handleRegenerate}>Régénérer</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>

								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="destructive" size="sm">
											<Trash2 className="mr-2 h-4 w-4" />
											Supprimer
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Supprimer ce run ?</AlertDialogTitle>
											<AlertDialogDescription>
												Le run et toutes ses tâches seront définitivement supprimés.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Annuler</AlertDialogCancel>
											<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</>
						)}
					</div>
				}
			/>

			<div className="p-6">
				{/* Progress bar */}
				<Card className="mb-6">
					<CardContent className="pt-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium">Progression</span>
							<span className="text-sm text-muted-foreground">{progressPct}%</span>
						</div>
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-600 rounded-full transition-all"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue="taches">
					<TabsList>
						<TabsTrigger value="taches">Tâches fiscales ({run.tachesTotal})</TabsTrigger>
						<TabsTrigger value="gates">Gates</TabsTrigger>
						<TabsTrigger value="documents">Documents</TabsTrigger>
					</TabsList>

					<TabsContent value="taches" className="mt-6">
						<div className="flex justify-end mb-3">
							<Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Depuis template
							</Button>
						</div>
						{run.taches.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								Aucune tâche générée. Vérifiez les données fiscales du client.
							</div>
						) : (
							<div className="overflow-x-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tâche</TableHead>
											<TableHead className="hidden md:table-cell">Catégorie</TableHead>
											<TableHead>Échéance</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{run.taches.map((tache) => {
											const overdue = isOverdue(tache.dateEcheance, tache.status)
											const upcoming = isUpcoming(tache.dateEcheance, tache.status)

											return (
												<TableRow
													key={tache._id}
													className="cursor-pointer"
													onClick={() => router.push(`/taches/${tache._id}`)}
												>
													<TableCell>
														<div className="flex items-center gap-2">
															<span className="font-medium">{tache.nom}</span>
															{overdue && (
																<Badge variant="destructive" className="text-xs">
																	En retard
																</Badge>
															)}
															{upcoming && !overdue && (
																<Badge className="bg-amber-100 text-amber-800 text-xs">J-3</Badge>
															)}
														</div>
														{tache.cerfa && (
															<span className="text-xs text-muted-foreground">
																Cerfa {tache.cerfa}
															</span>
														)}
													</TableCell>
													<TableCell className="hidden md:table-cell">
														{tache.categorie && (
															<Badge
																variant="secondary"
																className={CATEGORIE_COLORS[tache.categorie] ?? ""}
															>
																{tache.categorie}
															</Badge>
														)}
													</TableCell>
													<TableCell className={overdue ? "text-red-600 font-medium" : ""}>
														{formatDate(tache.dateEcheance)}
													</TableCell>
													<TableCell>
														<Select
															value={tache.status}
															onValueChange={(v) => {
																handleTaskStatusChange(tache._id, v)
															}}
														>
															<SelectTrigger
																className="w-32 h-8"
																onClick={(e) => e.stopPropagation()}
															>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="a_venir">À venir</SelectItem>
																<SelectItem value="en_cours">En cours</SelectItem>
																<SelectItem value="en_attente">En attente</SelectItem>
																<SelectItem value="termine">Terminé</SelectItem>
															</SelectContent>
														</Select>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</TabsContent>

					<TabsContent value="gates" className="mt-6">
						<GatesTab runId={id as Id<"runs">} />
					</TabsContent>

					<TabsContent value="documents" className="mt-6">
						<DocumentsTab runId={id as Id<"runs">} clientId={run.clientId} />
					</TabsContent>
				</Tabs>
			</div>

			{/* Dialog: appliquer un template */}
			<Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Ajouter une tâche depuis un template</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleApplyTemplate} className="space-y-4">
						<div>
							<Label>Template *</Label>
							<Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
								<SelectTrigger>
									<SelectValue placeholder="Choisir un template" />
								</SelectTrigger>
								<SelectContent>
									{tacheTemplates?.map((t) => (
										<SelectItem key={t._id} value={t._id}>
											{t.nom}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={!selectedTemplateId || applyingTemplate}
						>
							{applyingTemplate ? "Ajout…" : "Ajouter la tâche"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
