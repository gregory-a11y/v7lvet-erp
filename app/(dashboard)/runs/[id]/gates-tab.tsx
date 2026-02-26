"use client"

import { useMutation, useQuery } from "convex/react"
import { Check, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

const GATE_STATUS_LABELS: Record<string, string> = {
	a_valider: "À valider",
	valide: "Validé",
	refuse: "Refusé",
}

const GATE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	a_valider: "secondary",
	valide: "default",
	refuse: "destructive",
}

export function GatesTab({ runId }: { runId: Id<"runs"> }) {
	const { isAdmin } = useCurrentUser()
	const gates = useQuery(api.gates.listByRun, { runId })
	const templates = useQuery(api.gates.listTemplates)
	const createGate = useMutation(api.gates.create)
	const validateGate = useMutation(api.gates.validate)
	const rejectGate = useMutation(api.gates.reject)
	const removeGate = useMutation(api.gates.remove)

	const [dialogOpen, setDialogOpen] = useState(false)
	const [creating, setCreating] = useState(false)
	const [validateComment, setValidateComment] = useState("")
	const [rejectComment, setRejectComment] = useState("")
	const [form, setForm] = useState({
		nom: "",
		description: "",
		preuveAttendue: "",
		escaladeRegle: "",
		templateId: "",
	})

	function applyTemplate(templateId: string) {
		const tmpl = templates?.find((t) => t._id === templateId)
		if (!tmpl) return
		setForm({
			nom: tmpl.nom,
			description: tmpl.description ?? "",
			preuveAttendue: tmpl.preuveAttendue ?? "",
			escaladeRegle: tmpl.escaladeRegle ?? "",
			templateId,
		})
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await createGate({
				runId,
				nom: form.nom,
				description: form.description || undefined,
				preuveAttendue: form.preuveAttendue || undefined,
				escaladeRegle: form.escaladeRegle || undefined,
				ordre: (gates?.length ?? 0) + 1,
			})
			toast.success("Gate créée")
			setDialogOpen(false)
			setForm({ nom: "", description: "", preuveAttendue: "", escaladeRegle: "", templateId: "" })
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setCreating(false)
		}
	}

	async function handleValidate(gateId: Id<"gates">) {
		try {
			await validateGate({ id: gateId, commentaire: validateComment || undefined })
			toast.success("Gate validée")
			setValidateComment("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleReject(gateId: Id<"gates">) {
		try {
			await rejectGate({ id: gateId, commentaire: rejectComment || undefined })
			toast.success("Gate refusée")
			setRejectComment("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleRemove(gateId: Id<"gates">) {
		try {
			await removeGate({ id: gateId })
			toast.success("Gate supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Ajouter une gate
				</Button>
			</div>

			{gates === undefined ? (
				<div className="text-center py-8 text-muted-foreground">Chargement...</div>
			) : gates.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">Aucune gate pour ce run.</div>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8">#</TableHead>
								<TableHead>Gate</TableHead>
								<TableHead className="hidden md:table-cell">Preuve attendue</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...gates]
								.sort((a, b) => a.ordre - b.ordre)
								.map((gate) => (
									<TableRow key={gate._id}>
										<TableCell className="text-muted-foreground">{gate.ordre}</TableCell>
										<TableCell>
											<div className="font-medium">{gate.nom}</div>
											{gate.description && (
												<div className="text-xs text-muted-foreground mt-0.5">
													{gate.description}
												</div>
											)}
											{gate.commentaire && (
												<div className="text-xs text-muted-foreground italic mt-0.5">
													"{gate.commentaire}"
												</div>
											)}
										</TableCell>
										<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
											{gate.preuveAttendue ?? "—"}
										</TableCell>
										<TableCell>
											<Badge variant={GATE_STATUS_VARIANTS[gate.status] ?? "outline"}>
												{GATE_STATUS_LABELS[gate.status] ?? gate.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-1 justify-end">
												{gate.status === "a_valider" && (
													<>
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button size="sm" variant="outline" className="h-7">
																	<Check className="h-3 w-3 mr-1" />
																	Valider
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>Valider "{gate.nom}" ?</AlertDialogTitle>
																</AlertDialogHeader>
																<div className="py-2">
																	<Label htmlFor="validate-comment">Commentaire (optionnel)</Label>
																	<Textarea
																		id="validate-comment"
																		rows={2}
																		value={validateComment}
																		onChange={(e) => setValidateComment(e.target.value)}
																	/>
																</div>
																<AlertDialogFooter>
																	<AlertDialogCancel>Annuler</AlertDialogCancel>
																	<AlertDialogAction onClick={() => handleValidate(gate._id)}>
																		Valider
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button size="sm" variant="outline" className="h-7">
																	<X className="h-3 w-3 mr-1" />
																	Refuser
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>Refuser "{gate.nom}" ?</AlertDialogTitle>
																</AlertDialogHeader>
																<div className="py-2">
																	<Label htmlFor="reject-comment">Raison</Label>
																	<Textarea
																		id="reject-comment"
																		rows={2}
																		value={rejectComment}
																		onChange={(e) => setRejectComment(e.target.value)}
																	/>
																</div>
																<AlertDialogFooter>
																	<AlertDialogCancel>Annuler</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() => handleReject(gate._id)}
																		className="bg-destructive text-destructive-foreground"
																	>
																		Refuser
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</>
												)}
												{isAdmin && (
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button size="sm" variant="ghost" className="h-7 text-destructive">
																<Trash2 className="h-3 w-3" />
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Supprimer cette gate ?</AlertDialogTitle>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Annuler</AlertDialogCancel>
																<AlertDialogAction onClick={() => handleRemove(gate._id)}>
																	Supprimer
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Dialog Ajouter une gate */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ajouter une gate</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="space-y-4">
						{templates && templates.length > 0 && (
							<div>
								<Label>Depuis un template</Label>
								<Select value={form.templateId} onValueChange={applyTemplate}>
									<SelectTrigger>
										<SelectValue placeholder="Choisir un template (optionnel)" />
									</SelectTrigger>
									<SelectContent>
										{templates.map((t) => (
											<SelectItem key={t._id} value={t._id}>
												{t.nom}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label htmlFor="gate-nom">Nom *</Label>
							<Input
								id="gate-nom"
								value={form.nom}
								onChange={(e) => setForm({ ...form, nom: e.target.value })}
								required
							/>
						</div>
						<div>
							<Label htmlFor="gate-description">Description</Label>
							<Textarea
								id="gate-description"
								rows={2}
								value={form.description}
								onChange={(e) => setForm({ ...form, description: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="gate-preuve">Preuve attendue</Label>
							<Input
								id="gate-preuve"
								value={form.preuveAttendue}
								onChange={(e) => setForm({ ...form, preuveAttendue: e.target.value })}
								placeholder="Ex: Accusé de réception..."
							/>
						</div>
						<div>
							<Label htmlFor="gate-escalade">Règle d'escalade</Label>
							<Input
								id="gate-escalade"
								value={form.escaladeRegle}
								onChange={(e) => setForm({ ...form, escaladeRegle: e.target.value })}
								placeholder="Ex: Alerter le manager..."
							/>
						</div>
						<Button type="submit" className="w-full" disabled={creating}>
							{creating ? "Création..." : "Ajouter la gate"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
