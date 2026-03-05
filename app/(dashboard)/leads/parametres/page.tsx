"use client"

import { Palette, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AutomationsTab } from "@/components/automations/automations-tab"
import { OnboardingTemplateList } from "@/components/leads/onboarding-template-list"
import { PrestationCatalogManager } from "@/components/prestations/prestation-catalog-manager"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Id } from "@/convex/_generated/dataModel"
import {
	useAllLeadOptions,
	useCreateLeadOption,
	useUpdateLeadOption,
} from "@/lib/hooks/use-lead-options"

type OptionCategory = "source" | "type" | "todo_categorie"

const CATEGORY_LABELS: Record<OptionCategory, string> = {
	source: "Sources",
	type: "Types",
	todo_categorie: "Catégories de tâches",
}

function OptionRow({
	option,
	onToggle,
	onEdit,
}: {
	option: {
		_id: Id<"leadOptions">
		value: string
		label: string
		color?: string
		isActive: boolean
		isDefault: boolean
		order: number
	}
	onToggle: (id: Id<"leadOptions">, isActive: boolean) => void
	onEdit: (option: { _id: Id<"leadOptions">; label: string; color?: string }) => void
}) {
	return (
		<div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors">
			<div className="flex items-center gap-3">
				{option.color && (
					<span
						className="h-3 w-3 rounded-full shrink-0"
						style={{ backgroundColor: option.color }}
					/>
				)}
				<div>
					<span className="text-sm font-medium">{option.label}</span>
					<span className="text-xs text-muted-foreground ml-2">({option.value})</span>
				</div>
				{option.isDefault && (
					<Badge variant="secondary" className="text-[9px] px-1.5 py-0">
						Défaut
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs"
					onClick={() => onEdit({ _id: option._id, label: option.label, color: option.color })}
				>
					Modifier
				</Button>
				<Switch
					checked={option.isActive}
					onCheckedChange={(checked) => onToggle(option._id, checked)}
				/>
			</div>
		</div>
	)
}

function OnboardingTab() {
	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Tâches d'onboarding générées automatiquement pour les nouveaux leads
			</p>
			<div className="max-w-3xl">
				<OnboardingTemplateList />
			</div>
		</div>
	)
}

function OptionsTab() {
	const [activeCategory, setActiveCategory] = useState<OptionCategory>("source")
	const options = useAllLeadOptions(activeCategory)
	const createOption = useCreateLeadOption()
	const updateOption = useUpdateLeadOption()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<{
		_id?: Id<"leadOptions">
		label: string
		value: string
		color: string
	} | null>(null)

	const handleToggle = async (id: Id<"leadOptions">, isActive: boolean) => {
		try {
			await updateOption({ id, isActive })
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const handleEdit = (option: { _id: Id<"leadOptions">; label: string; color?: string }) => {
		setEditingOption({
			_id: option._id,
			label: option.label,
			value: "",
			color: option.color ?? "#94a3b8",
		})
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingOption({ label: "", value: "", color: "#94a3b8" })
		setDialogOpen(true)
	}

	const handleSave = async () => {
		if (!editingOption) return
		try {
			if (editingOption._id) {
				await updateOption({
					id: editingOption._id,
					label: editingOption.label,
					color: editingOption.color,
				})
				toast.success("Option modifiée")
			} else {
				if (!editingOption.value.trim() || !editingOption.label.trim()) {
					toast.error("Valeur et label obligatoires")
					return
				}
				await createOption({
					category: activeCategory,
					value: editingOption.value.trim().toLowerCase().replace(/\s+/g, "_"),
					label: editingOption.label.trim(),
					color: editingOption.color,
				})
				toast.success("Option créée")
			}
			setDialogOpen(false)
			setEditingOption(null)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Configurer les sources, types et prestations du CRM
				</p>
				<Button size="sm" className="gap-1.5" onClick={handleAdd}>
					<Plus className="h-4 w-4" />
					Ajouter
				</Button>
			</div>

			<Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as OptionCategory)}>
				<TabsList>
					<TabsTrigger value="source">Sources</TabsTrigger>
					<TabsTrigger value="type">Types</TabsTrigger>
				</TabsList>

				{(["source", "type"] as const).map((cat) => (
					<TabsContent key={cat} value={cat}>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">
									{CATEGORY_LABELS[cat]} ({options?.length ?? 0})
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-0.5">
								{options === undefined ? (
									<p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
								) : options.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
										<Palette className="h-8 w-8 mb-2 text-muted-foreground/40" />
										<p>Aucune option configurée</p>
									</div>
								) : (
									options.map((opt) => (
										<OptionRow
											key={opt._id}
											option={opt}
											onToggle={handleToggle}
											onEdit={handleEdit}
										/>
									))
								)}
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingOption?._id ? "Modifier l'option" : "Nouvelle option"}
						</DialogTitle>
					</DialogHeader>
					{editingOption && (
						<div className="space-y-4">
							{!editingOption._id && (
								<div className="space-y-1.5">
									<Label>Valeur (slug)</Label>
									<Input
										placeholder="ex: recommandation"
										value={editingOption.value}
										onChange={(e) => setEditingOption({ ...editingOption, value: e.target.value })}
									/>
									<p className="text-[10px] text-muted-foreground">
										Identifiant unique, minuscules, underscores
									</p>
								</div>
							)}
							<div className="space-y-1.5">
								<Label>Label affiché</Label>
								<Input
									placeholder="ex: Recommandation"
									value={editingOption.label}
									onChange={(e) => setEditingOption({ ...editingOption, label: e.target.value })}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Couleur</Label>
								<div className="flex items-center gap-2">
									<input
										type="color"
										value={editingOption.color}
										onChange={(e) => setEditingOption({ ...editingOption, color: e.target.value })}
										className="h-8 w-8 rounded border cursor-pointer"
									/>
									<Input
										value={editingOption.color}
										onChange={(e) => setEditingOption({ ...editingOption, color: e.target.value })}
										className="w-24"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<Button variant="outline" onClick={() => setDialogOpen(false)}>
									Annuler
								</Button>
								<Button onClick={handleSave}>{editingOption._id ? "Enregistrer" : "Créer"}</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

function TodoCategoriesTab() {
	const options = useAllLeadOptions("todo_categorie")
	const createOption = useCreateLeadOption()
	const updateOption = useUpdateLeadOption()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<{
		_id?: Id<"leadOptions">
		label: string
		value: string
	} | null>(null)

	const handleToggle = async (id: Id<"leadOptions">, isActive: boolean) => {
		try {
			await updateOption({ id, isActive })
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const handleEdit = (option: { _id: Id<"leadOptions">; label: string; color?: string }) => {
		setEditingOption({ _id: option._id, label: option.label, value: "" })
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingOption({ label: "", value: "" })
		setDialogOpen(true)
	}

	const handleSave = async () => {
		if (!editingOption) return
		try {
			if (editingOption._id) {
				await updateOption({ id: editingOption._id, label: editingOption.label })
				toast.success("Catégorie modifiée")
			} else {
				if (!editingOption.value.trim() || !editingOption.label.trim()) {
					toast.error("Valeur et label obligatoires")
					return
				}
				await createOption({
					category: "todo_categorie",
					value: editingOption.value.trim().toLowerCase().replace(/\s+/g, "_"),
					label: editingOption.label.trim(),
				})
				toast.success("Catégorie créée")
			}
			setDialogOpen(false)
			setEditingOption(null)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Définir les catégories disponibles lors de la création d'une tâche
				</p>
				<Button size="sm" className="gap-1.5" onClick={handleAdd}>
					<Plus className="h-4 w-4" />
					Ajouter une catégorie
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Catégories ({options?.length ?? 0})</CardTitle>
				</CardHeader>
				<CardContent className="space-y-0.5">
					{options === undefined ? (
						<p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
					) : options.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
							<Palette className="h-8 w-8 mb-2 text-muted-foreground/40" />
							<p>Aucune catégorie configurée</p>
							<p className="text-xs mt-1">Ajoutez vos premières catégories de tâches</p>
						</div>
					) : (
						options.map((opt) => (
							<OptionRow key={opt._id} option={opt} onToggle={handleToggle} onEdit={handleEdit} />
						))
					)}
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingOption?._id ? "Modifier la catégorie" : "Nouvelle catégorie"}
						</DialogTitle>
					</DialogHeader>
					{editingOption && (
						<div className="space-y-4">
							{!editingOption._id && (
								<div className="space-y-1.5">
									<Label>Identifiant (slug)</Label>
									<Input
										placeholder="ex: administratif"
										value={editingOption.value}
										onChange={(e) => setEditingOption({ ...editingOption, value: e.target.value })}
									/>
									<p className="text-[10px] text-muted-foreground">
										Minuscules, underscores — ne peut pas être modifié après
									</p>
								</div>
							)}
							<div className="space-y-1.5">
								<Label>Nom affiché</Label>
								<Input
									placeholder="ex: Administratif"
									value={editingOption.label}
									onChange={(e) => setEditingOption({ ...editingOption, label: e.target.value })}
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<Button variant="outline" onClick={() => setDialogOpen(false)}>
									Annuler
								</Button>
								<Button onClick={handleSave}>{editingOption._id ? "Enregistrer" : "Créer"}</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default function ParametresPage() {
	const [activeTab, setActiveTab] = useState("onboarding")

	return (
		<div className="flex flex-col h-full">
			<PageHeader title="Paramètres" description="Configuration du CRM, onboarding et tâches" />

			<div className="px-6 pt-4 flex-1">
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList>
						<TabsTrigger value="onboarding">Onboarding</TabsTrigger>
						<TabsTrigger value="options">Options CRM</TabsTrigger>
						<TabsTrigger value="prestations">Prestations</TabsTrigger>
						<TabsTrigger value="taches">Gestion tâches</TabsTrigger>
						<TabsTrigger value="automations">Automatisations</TabsTrigger>
					</TabsList>

					<TabsContent value="onboarding" className="mt-6">
						<OnboardingTab />
					</TabsContent>

					<TabsContent value="options" className="mt-6">
						<OptionsTab />
					</TabsContent>

					<TabsContent value="prestations" className="mt-6">
						<PrestationCatalogManager />
					</TabsContent>

					<TabsContent value="taches" className="mt-6">
						<TodoCategoriesTab />
					</TabsContent>

					<TabsContent value="automations" className="mt-6">
						<AutomationsTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
