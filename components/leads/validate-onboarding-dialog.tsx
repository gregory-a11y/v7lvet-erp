"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { Doc } from "@/convex/_generated/dataModel"
import { usePrestationLabels } from "@/lib/hooks/use-lead-options"
import { useOnboardingTemplates } from "@/lib/hooks/use-onboarding"

interface ValidateOnboardingDialogProps {
	open: boolean
	lead: Doc<"leads"> | null
	teamMembers?: Array<{ userId: string; nom?: string }>
	onConfirm: (responsableId: string) => void
	onCancel: () => void
}

export function ValidateOnboardingDialog({
	open,
	lead,
	teamMembers,
	onConfirm,
	onCancel,
}: ValidateOnboardingDialogProps) {
	const prestationLabels = usePrestationLabels()
	const templates = useOnboardingTemplates()
	const activeTemplates = templates?.filter((t) => t.isActive) ?? []

	const [responsableId, setResponsableId] = useState<string>("")

	const handleOpenChange = (o: boolean) => {
		if (!o) {
			handleCancel()
		}
	}

	const handleConfirm = () => {
		if (!responsableId) return
		onConfirm(responsableId)
		setResponsableId("")
	}

	const handleCancel = () => {
		setResponsableId("")
		onCancel()
	}

	// Pre-fill responsable when lead changes
	const defaultResponsable = lead?.responsableId ?? ""
	if (open && !responsableId && defaultResponsable) {
		setResponsableId(defaultResponsable)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Lancer l'onboarding</DialogTitle>
					<DialogDescription>
						Êtes-vous sûr de vouloir lancer l'onboarding pour{" "}
						<span className="font-medium text-foreground">{lead?.contactNom}</span> ?
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Prestations */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground font-medium">Prestations</Label>
						<div className="flex flex-wrap gap-1.5">
							{lead?.prestations && lead.prestations.length > 0 ? (
								lead.prestations.map((p) => (
									<Badge key={p} variant="secondary" className="text-xs">
										{prestationLabels[p] ?? p}
									</Badge>
								))
							) : (
								<span className="text-xs text-muted-foreground italic">Aucune prestation</span>
							)}
						</div>
					</div>

					{/* Tâches qui seront créées */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground font-medium">
							Tâches qui seront créées ({activeTemplates.length})
						</Label>
						{activeTemplates.length > 0 ? (
							<ol className="list-decimal list-inside text-sm space-y-0.5">
								{activeTemplates.map((t) => (
									<li key={t._id} className="text-muted-foreground">
										<span className="text-foreground">{t.nom}</span>
									</li>
								))}
							</ol>
						) : (
							<p className="text-xs text-muted-foreground italic">Aucun template actif</p>
						)}
					</div>

					{/* Responsable */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground font-medium">
							Responsable onboarding
						</Label>
						<Select value={responsableId} onValueChange={setResponsableId}>
							<SelectTrigger>
								<SelectValue placeholder="Sélectionner un responsable" />
							</SelectTrigger>
							<SelectContent>
								{teamMembers?.map((m) => (
									<SelectItem key={m.userId} value={m.userId}>
										{m.nom ?? m.userId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<p className="text-xs text-muted-foreground">
						Les accès client à la plateforme seront envoyés.
					</p>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleCancel}>
						Annuler
					</Button>
					<Button onClick={handleConfirm} disabled={!responsableId}>
						Confirmer l'onboarding
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
