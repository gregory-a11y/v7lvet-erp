"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import type { Doc } from "@/convex/_generated/dataModel"
import {
	useCreateOnboardingTemplate,
	useUpdateOnboardingTemplate,
} from "@/lib/hooks/use-onboarding"

interface OnboardingTemplateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	template?: Doc<"onboardingTemplates"> | null
	nextOrdre: number
}

export function OnboardingTemplateDialog({
	open,
	onOpenChange,
	template,
	nextOrdre,
}: OnboardingTemplateDialogProps) {
	const createTemplate = useCreateOnboardingTemplate()
	const updateTemplate = useUpdateOnboardingTemplate()

	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [ordre, setOrdre] = useState(nextOrdre)
	const [submitting, setSubmitting] = useState(false)

	const isEditing = !!template

	useEffect(() => {
		if (template) {
			setNom(template.nom)
			setDescription(template.description ?? "")
			setOrdre(template.ordre)
		} else {
			setNom("")
			setDescription("")
			setOrdre(nextOrdre)
		}
	}, [template, nextOrdre])

	const handleSubmit = async () => {
		if (!nom.trim()) return
		setSubmitting(true)
		try {
			if (isEditing && template) {
				await updateTemplate({
					id: template._id,
					nom: nom.trim(),
					description: description.trim() || undefined,
					ordre,
				})
				toast.success("Template mis à jour")
			} else {
				await createTemplate({
					nom: nom.trim(),
					description: description.trim() || undefined,
					ordre,
				})
				toast.success("Template créé")
			}
			onOpenChange(false)
		} catch (err: any) {
			toast.error(err.message ?? "Erreur")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Modifier le template" : "Nouveau template"}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Nom *</Label>
						<Input
							value={nom}
							onChange={(e) => setNom(e.target.value)}
							placeholder="Nom de la tâche..."
						/>
					</div>
					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Description de la tâche..."
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label>Ordre</Label>
						<Input
							type="number"
							value={ordre}
							onChange={(e) => setOrdre(Number(e.target.value))}
							min={1}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button onClick={handleSubmit} disabled={submitting || !nom.trim()}>
						{submitting ? "..." : isEditing ? "Enregistrer" : "Créer"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
