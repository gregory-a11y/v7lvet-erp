"use client"

import { ArrowLeft, Building2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import type { Doc } from "@/convex/_generated/dataModel"
import { useConvertToClient, useDeleteLead, useMoveToStage } from "@/lib/hooks/use-leads"
import { LostReasonDialog } from "./lost-reason-dialog"

const STATUT_LABELS: Record<string, string> = {
	prise_de_contact: "Prise de contact",
	rendez_vous: "Rendez-vous",
	qualification: "Qualification",
	go_no_go: "Go / No Go",
	valide: "Validé",
	onboarding: "Onboarding",
	perdu: "Perdu",
	a_relancer: "À relancer",
}

const STATUT_COLORS: Record<string, string> = {
	prise_de_contact: "bg-gray-100 text-gray-700",
	rendez_vous: "bg-blue-50 text-blue-700",
	qualification: "bg-violet-50 text-violet-700",
	go_no_go: "bg-amber-50 text-amber-700",
	valide: "bg-emerald-50 text-emerald-700",
	onboarding: "bg-green-50 text-green-700",
	perdu: "bg-red-50 text-red-700",
	a_relancer: "bg-orange-50 text-orange-700",
}

const PIPELINE_ORDER = [
	"prise_de_contact",
	"rendez_vous",
	"qualification",
	"go_no_go",
	"valide",
	"onboarding",
	"perdu",
	"a_relancer",
]

interface LeadActionsBarProps {
	lead: Doc<"leads">
}

export function LeadActionsBar({ lead }: LeadActionsBarProps) {
	const router = useRouter()
	const moveToStage = useMoveToStage()
	const convertToClient = useConvertToClient()
	const deleteLead = useDeleteLead()

	const [lostDialogOpen, setLostDialogOpen] = useState(false)
	const [convertDialogOpen, setConvertDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [raisonSociale, setRaisonSociale] = useState(
		lead.entrepriseRaisonSociale ?? lead.contactNom,
	)

	const handleStageChange = async (newStatut: string) => {
		if (newStatut === "perdu") {
			setLostDialogOpen(true)
			return
		}
		try {
			await moveToStage({ id: lead._id, statut: newStatut })
			toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut]}`)
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	const handleLostConfirm = async (raisonPerte: string) => {
		try {
			await moveToStage({ id: lead._id, statut: "perdu", raisonPerte })
			toast.success("Lead marqué comme perdu")
			setLostDialogOpen(false)
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	const handleConvert = async () => {
		if (!raisonSociale.trim()) return
		try {
			const clientId = await convertToClient({ id: lead._id, raisonSociale: raisonSociale.trim() })
			toast.success("Lead converti en client !")
			router.push(`/clients/${clientId}`)
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	const handleDelete = async () => {
		try {
			await deleteLead(lead._id)
			toast.success("Lead supprimé")
			router.push("/leads")
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	return (
		<>
			<div className="flex items-center gap-3 flex-wrap">
				<Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/leads")}>
					<ArrowLeft className="h-4 w-4" />
					Retour
				</Button>

				<div className="flex-1" />

				{/* Current status badge */}
				<Badge variant="secondary" className={`${STATUT_COLORS[lead.statut]} text-xs`}>
					{STATUT_LABELS[lead.statut]}
				</Badge>

				{/* Stage selector */}
				<Select value={lead.statut} onValueChange={handleStageChange}>
					<SelectTrigger className="h-8 w-[180px] text-xs">
						<SelectValue placeholder="Changer le statut..." />
					</SelectTrigger>
					<SelectContent>
						{PIPELINE_ORDER.map((s) => (
							<SelectItem key={s} value={s}>
								{STATUT_LABELS[s]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Convert to client */}
				{(lead.statut === "valide" || lead.statut === "onboarding") && !lead.clientId && (
					<Button size="sm" className="gap-1.5" onClick={() => setConvertDialogOpen(true)}>
						<Building2 className="h-3.5 w-3.5" />
						Convertir en client
					</Button>
				)}

				{/* Delete */}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-destructive hover:text-destructive"
					onClick={() => setDeleteDialogOpen(true)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			{/* Lost reason dialog */}
			<LostReasonDialog
				open={lostDialogOpen}
				onConfirm={handleLostConfirm}
				onCancel={() => setLostDialogOpen(false)}
			/>

			{/* Convert dialog */}
			<Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Convertir en client</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-2">
							<Label>Raison sociale du client</Label>
							<Input
								value={raisonSociale}
								onChange={(e) => setRaisonSociale(e.target.value)}
								placeholder="Nom de l'entreprise"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
							Annuler
						</Button>
						<Button onClick={handleConvert} disabled={!raisonSociale.trim()}>
							Convertir
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est irréversible. Le lead "{lead.contactNom}" et toutes ses tâches
							d'onboarding seront supprimés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
