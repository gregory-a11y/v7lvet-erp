"use client"

import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
	useDeleteOnboardingTemplate,
	useOnboardingTemplates,
	useUpdateOnboardingTemplate,
} from "@/lib/hooks/use-onboarding"
import { OnboardingTemplateDialog } from "./onboarding-template-dialog"

export function OnboardingTemplateList() {
	const templates = useOnboardingTemplates()
	const updateTemplate = useUpdateOnboardingTemplate()
	const deleteTemplate = useDeleteOnboardingTemplate()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingTemplate, setEditingTemplate] = useState<Doc<"onboardingTemplates"> | null>(null)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deletingId, setDeletingId] = useState<Id<"onboardingTemplates"> | null>(null)

	if (!templates) return null

	const sorted = [...templates].sort((a, b) => a.ordre - b.ordre)
	const nextOrdre = sorted.length > 0 ? sorted[sorted.length - 1].ordre + 1 : 1

	const handleToggleActive = async (template: Doc<"onboardingTemplates">) => {
		try {
			await updateTemplate({ id: template._id, isActive: !template.isActive })
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	const handleEdit = (template: Doc<"onboardingTemplates">) => {
		setEditingTemplate(template)
		setDialogOpen(true)
	}

	const handleCreate = () => {
		setEditingTemplate(null)
		setDialogOpen(true)
	}

	const handleDeleteConfirm = async () => {
		if (!deletingId) return
		try {
			await deleteTemplate(deletingId)
			toast.success("Template supprimé")
		} catch (err: any) {
			toast.error(err.message)
		}
		setDeletingId(null)
		setDeleteDialogOpen(false)
	}

	return (
		<>
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Templates d'onboarding</CardTitle>
						<Button size="sm" className="gap-1.5" onClick={handleCreate}>
							<Plus className="h-3.5 w-3.5" />
							Ajouter
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						Ces tâches seront automatiquement créées quand un lead passe en "Validé".
					</p>
				</CardHeader>
				<CardContent>
					{sorted.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							Aucun template. Ajoutez-en un ou utilisez les templates par défaut.
						</p>
					) : (
						<div className="space-y-1">
							{sorted.map((template) => (
								<div
									key={template._id}
									className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/40 transition-colors"
								>
									<GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
									<Badge variant="outline" className="text-[10px] shrink-0 w-6 justify-center">
										{template.ordre}
									</Badge>
									<div className="flex-1 min-w-0">
										<p
											className={`text-sm font-medium ${!template.isActive ? "text-muted-foreground line-through" : ""}`}
										>
											{template.nom}
										</p>
										{template.description && (
											<p className="text-[11px] text-muted-foreground truncate">
												{template.description}
											</p>
										)}
									</div>
									<Switch
										checked={template.isActive}
										onCheckedChange={() => handleToggleActive(template)}
									/>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => handleEdit(template)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-destructive hover:text-destructive"
										onClick={() => {
											setDeletingId(template._id)
											setDeleteDialogOpen(true)
										}}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<OnboardingTemplateDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				template={editingTemplate}
				nextOrdre={nextOrdre}
			/>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
						<AlertDialogDescription>
							Les tâches déjà générées ne seront pas affectées.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
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
