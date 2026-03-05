"use client"

import { useQuery } from "convex/react"
import { Building2, CalendarClock, Clock, ListChecks, Trash2, Users, X } from "lucide-react"
import { useMemo } from "react"
import { SopPicker } from "@/components/shared/sop-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { AutomationFormData, TacheItem } from "./automation-flow-editor"

// =============================================================================
// Constants
// =============================================================================

const FORME_JURIDIQUE_OPTIONS = [
	"SARL",
	"SAS",
	"SA",
	"SASU",
	"EI",
	"SNC",
	"SCI",
	"EURL",
	"SELARL",
	"SCM",
	"SCP",
	"Auto-entrepreneur",
	"Micro-entreprise",
	"Autre",
]
const REGIME_TVA_OPTIONS = [
	{ value: "franchise_en_base", label: "Franchise en base" },
	{ value: "reel_normal", label: "Réel normal" },
	{ value: "rsi", label: "RSI" },
	{ value: "exoneree", label: "Exonérée" },
]
const CATEGORIE_FISCALE_OPTIONS = [
	{ value: "IR-BNC", label: "IR-BNC" },
	{ value: "IR-BIC", label: "IR-BIC" },
	{ value: "IR-RF", label: "IR-RF" },
	{ value: "IS", label: "IS" },
]
const ACTIVITE_OPTIONS = [
	{ value: "profession_liberale_medicale", label: "Profession libérale médicale" },
	{ value: "autres_professions_liberales", label: "Autres professions libérales" },
	{
		value: "commerciale_industrielle_artisanale",
		label: "Commerciale / Industrielle / Artisanale",
	},
	{ value: "agricole", label: "Agricole" },
	{ value: "civile", label: "Civile" },
]
const FREQUENCE_TVA_OPTIONS = [
	{ value: "mensuelle", label: "Mensuelle" },
	{ value: "trimestrielle", label: "Trimestrielle" },
	{ value: "annuelle", label: "Annuelle" },
]
const VARIABLE_TAGS = [
	{ label: "{{client}}", desc: "Raison sociale" },
	{ label: "{{mois}}", desc: "Mois courant" },
	{ label: "{{annee}}", desc: "Année" },
	{ label: "{{prestation}}", desc: "Prestations" },
	{ label: "{{responsable}}", desc: "Responsable" },
	{ label: "{{trimestre}}", desc: "Trimestre" },
]
const MOIS_FR = [
	"janvier",
	"février",
	"mars",
	"avril",
	"mai",
	"juin",
	"juillet",
	"août",
	"septembre",
	"octobre",
	"novembre",
	"décembre",
]
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
const MOIS_OPTIONS = MOIS_FR.map((m, i) => ({
	value: i + 1,
	label: m.charAt(0).toUpperCase() + m.slice(1),
}))

// =============================================================================
// Props
// =============================================================================

export type SelectedNodeType = "trigger" | "schedule" | "task"

interface AutomationEditorPanelProps {
	selectedNodeType: SelectedNodeType
	selectedTaskId?: string
	form: AutomationFormData
	onChange: (updates: Partial<AutomationFormData>) => void
	onUpdateTask: (taskId: string, updates: Partial<TacheItem>) => void
	onDeleteTask: (taskId: string) => void
	onClose: () => void
}

// =============================================================================
// Main Panel
// =============================================================================

export function AutomationEditorPanel({
	selectedNodeType,
	selectedTaskId,
	form,
	onChange,
	onUpdateTask,
	onDeleteTask,
	onClose,
}: AutomationEditorPanelProps) {
	const NODE_TYPE_INFO: Record<
		SelectedNodeType,
		{ icon: React.ReactNode; label: string; color: string }
	> = {
		trigger: {
			icon:
				form.mode === "equipe" ? <Users className="h-4 w-4" /> : <Building2 className="h-4 w-4" />,
			label: "Ciblage",
			color: form.mode === "equipe" ? "#2E6965" : "#1d4ed8",
		},
		schedule: {
			icon:
				form.planificationType === "frequence" ? (
					<Clock className="h-4 w-4" />
				) : (
					<CalendarClock className="h-4 w-4" />
				),
			label: "Planification",
			color: "#0284c7",
		},
		task: {
			icon: <ListChecks className="h-4 w-4" />,
			label: "Tâche",
			color: "#2E6965",
		},
	}

	const typeInfo = NODE_TYPE_INFO[selectedNodeType]

	return (
		<div className="h-full border-l bg-background flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="flex items-center gap-2" style={{ color: typeInfo.color }}>
					{typeInfo.icon}
					<span className="text-sm font-semibold">{typeInfo.label}</span>
				</div>
				<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{selectedNodeType === "trigger" && <TriggerEditor form={form} onChange={onChange} />}
				{selectedNodeType === "schedule" && <ScheduleEditor form={form} onChange={onChange} />}
				{selectedNodeType === "task" && selectedTaskId && (
					<TaskEditor
						task={form.taches.find((t) => t.id === selectedTaskId)}
						onUpdate={(updates) => onUpdateTask(selectedTaskId, updates)}
						onDelete={() => onDeleteTask(selectedTaskId)}
					/>
				)}
			</div>
		</div>
	)
}

// =============================================================================
// Trigger Editor
// =============================================================================

function TriggerEditor({
	form,
	onChange,
}: {
	form: AutomationFormData
	onChange: (u: Partial<AutomationFormData>) => void
}) {
	const fonctions = useQuery(api.fonctions.list)
	const prestations = useQuery(api.prestations.list)

	return (
		<div className="space-y-4">
			{/* Mode */}
			<section className="space-y-2">
				<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Mode
				</Label>
				<div className="flex gap-2">
					<Button
						type="button"
						variant={form.mode === "equipe" ? "default" : "outline"}
						size="sm"
						onClick={() => onChange({ mode: "equipe" })}
					>
						Équipe
					</Button>
					<Button
						type="button"
						variant={form.mode === "client" ? "default" : "outline"}
						size="sm"
						onClick={() => onChange({ mode: "client" })}
					>
						Client
					</Button>
				</div>
			</section>

			<Separator />

			{/* Ciblage */}
			{form.mode === "equipe" ? (
				<section className="space-y-3">
					<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Ciblage équipe
					</Label>
					<Select
						value={form.cibleEquipe}
						onValueChange={(v) => onChange({ cibleEquipe: v as AutomationFormData["cibleEquipe"] })}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="tous">Tous les membres</SelectItem>
							<SelectItem value="par_role">Par rôle</SelectItem>
							<SelectItem value="par_fonction">Par fonction</SelectItem>
						</SelectContent>
					</Select>

					{form.cibleEquipe === "par_role" && (
						<Select
							value={form.cibleRole}
							onValueChange={(v) => onChange({ cibleRole: v as AutomationFormData["cibleRole"] })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="manager">Manager</SelectItem>
								<SelectItem value="collaborateur">Collaborateur</SelectItem>
							</SelectContent>
						</Select>
					)}

					{form.cibleEquipe === "par_fonction" && (
						<Select
							value={form.cibleFonctionId}
							onValueChange={(v) => onChange({ cibleFonctionId: v })}
						>
							<SelectTrigger>
								<SelectValue placeholder="Choisir une fonction" />
							</SelectTrigger>
							<SelectContent>
								{fonctions?.map((fn) => (
									<SelectItem key={fn._id} value={fn._id}>
										{fn.nom}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</section>
			) : (
				<section className="space-y-4">
					<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Ciblage client
					</Label>

					<div className="space-y-2">
						<Label className="text-xs">Assigner à</Label>
						<Select
							value={form.assignationClient}
							onValueChange={(v) =>
								onChange({ assignationClient: v as AutomationFormData["assignationClient"] })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="responsable_operationnel">Responsable opérationnel</SelectItem>
								<SelectItem value="responsable_hierarchique">Responsable hiérarchique</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-3">
						<Label className="text-xs text-muted-foreground">
							Filtres (optionnels, combinés en ET)
						</Label>

						{prestations && prestations.length > 0 && (
							<div className="space-y-1.5">
								<Label className="text-xs">Prestations</Label>
								<div className="flex flex-wrap gap-2">
									{prestations.map((p) => (
										<div key={p._id} className="flex items-center gap-1.5 text-xs">
											<Checkbox
												id={`panel-presta-${p._id}`}
												checked={form.filtresPrestationIds.includes(p._id)}
												onCheckedChange={(checked) => {
													if (checked) {
														onChange({
															filtresPrestationIds: [...form.filtresPrestationIds, p._id],
														})
													} else {
														onChange({
															filtresPrestationIds: form.filtresPrestationIds.filter(
																(id) => id !== p._id,
															),
														})
													}
												}}
											/>
											<Label htmlFor={`panel-presta-${p._id}`} className="text-xs cursor-pointer">
												{p.titre}
											</Label>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 gap-3">
							<FilterSelect
								label="Forme juridique"
								value={form.filtresFormeJuridique}
								onValueChange={(v) => onChange({ filtresFormeJuridique: v })}
								options={FORME_JURIDIQUE_OPTIONS.map((fj) => ({ value: fj, label: fj }))}
							/>
							<FilterSelect
								label="Régime TVA"
								value={form.filtresRegimeTVA}
								onValueChange={(v) => onChange({ filtresRegimeTVA: v })}
								options={REGIME_TVA_OPTIONS}
							/>
							<FilterSelect
								label="Catégorie fiscale"
								value={form.filtresCategorieFiscale}
								onValueChange={(v) => onChange({ filtresCategorieFiscale: v })}
								options={CATEGORIE_FISCALE_OPTIONS}
							/>
							<FilterSelect
								label="Activité"
								value={form.filtresActivite}
								onValueChange={(v) => onChange({ filtresActivite: v })}
								options={ACTIVITE_OPTIONS}
							/>
							<FilterSelect
								label="Fréquence TVA"
								value={form.filtresFrequenceTVA}
								onValueChange={(v) => onChange({ filtresFrequenceTVA: v })}
								options={FREQUENCE_TVA_OPTIONS}
							/>
						</div>
					</div>
				</section>
			)}
		</div>
	)
}

function FilterSelect({
	label,
	value,
	onValueChange,
	options,
}: {
	label: string
	value: string
	onValueChange: (v: string) => void
	options: { value: string; label: string }[]
}) {
	return (
		<div className="space-y-1.5">
			<Label className="text-xs">{label}</Label>
			<Select
				value={value || "__none__"}
				onValueChange={(v) => onValueChange(v === "__none__" ? "" : v)}
			>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue placeholder="Tous" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="__none__">Tous</SelectItem>
					{options.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}

// =============================================================================
// Schedule Editor
// =============================================================================

function ScheduleEditor({
	form,
	onChange,
}: {
	form: AutomationFormData
	onChange: (u: Partial<AutomationFormData>) => void
}) {
	return (
		<div className="space-y-4">
			<section className="space-y-2">
				<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Type de planification
				</Label>
				<div className="flex gap-2">
					<Button
						type="button"
						variant={form.planificationType === "frequence" ? "default" : "outline"}
						size="sm"
						onClick={() => onChange({ planificationType: "frequence" })}
					>
						Fréquence fixe
					</Button>
					{form.mode === "client" && (
						<Button
							type="button"
							variant={form.planificationType === "date_relative" ? "default" : "outline"}
							size="sm"
							onClick={() => onChange({ planificationType: "date_relative" })}
						>
							Date relative
						</Button>
					)}
				</div>
			</section>

			<Separator />

			{form.planificationType === "frequence" ? (
				<section className="space-y-3">
					<Select
						value={form.frequence}
						onValueChange={(v) => onChange({ frequence: v as AutomationFormData["frequence"] })}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="quotidien">Quotidien</SelectItem>
							<SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
							<SelectItem value="mensuel">Mensuel</SelectItem>
							<SelectItem value="trimestriel">Trimestriel</SelectItem>
							<SelectItem value="annuel">Annuel</SelectItem>
						</SelectContent>
					</Select>

					{form.frequence === "hebdomadaire" && (
						<div className="space-y-1.5">
							<Label className="text-xs">Jour de la semaine</Label>
							<Select
								value={String(form.jourSemaine)}
								onValueChange={(v) => onChange({ jourSemaine: Number(v) })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{JOURS_SEMAINE.map((j, i) => (
										<SelectItem key={i} value={String(i)}>
											{j}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{["mensuel", "trimestriel", "annuel"].includes(form.frequence) && (
						<div className="space-y-1.5">
							<Label className="text-xs">Jour du mois</Label>
							<Input
								type="number"
								min={1}
								max={28}
								value={form.jourMois}
								onChange={(e) => onChange({ jourMois: Number(e.target.value) })}
							/>
						</div>
					)}

					{form.frequence === "trimestriel" && (
						<div className="space-y-1.5">
							<Label className="text-xs">Mois du trimestre (1-3)</Label>
							<Select
								value={String(form.moisTrimestre)}
								onValueChange={(v) => onChange({ moisTrimestre: Number(v) })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1er mois</SelectItem>
									<SelectItem value="2">2ème mois</SelectItem>
									<SelectItem value="3">3ème mois</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{form.frequence === "annuel" && (
						<div className="space-y-1.5">
							<Label className="text-xs">Mois</Label>
							<Select
								value={String(form.moisAnnee)}
								onValueChange={(v) => onChange({ moisAnnee: Number(v) })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MOIS_OPTIONS.map((m) => (
										<SelectItem key={m.value} value={String(m.value)}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</section>
			) : (
				<section className="space-y-3">
					<div className="space-y-1.5">
						<Label className="text-xs">Date de référence</Label>
						<Select
							value={form.dateReference}
							onValueChange={(v) =>
								onChange({ dateReference: v as AutomationFormData["dateReference"] })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="dateClotureComptable">Clôture comptable</SelectItem>
								<SelectItem value="dateEntree">Date d'entrée</SelectItem>
								<SelectItem value="jourTVA">Jour TVA</SelectItem>
								<SelectItem value="datePaiementDividendes">Dividendes</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Décalage en jours (négatif = avant)</Label>
						<Input
							type="number"
							value={form.joursDecalage}
							onChange={(e) => onChange({ joursDecalage: Number(e.target.value) })}
						/>
					</div>
					{form.dateReference === "jourTVA" && (
						<div className="space-y-1.5">
							<Label className="text-xs">Période</Label>
							<Select
								value={form.periodeRelative}
								onValueChange={(v) =>
									onChange({ periodeRelative: v as AutomationFormData["periodeRelative"] })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="annuel">Annuel</SelectItem>
									<SelectItem value="selon_frequence_tva">Selon fréquence TVA du client</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</section>
			)}
		</div>
	)
}

// =============================================================================
// Task Editor
// =============================================================================

function TaskEditor({
	task,
	onUpdate,
	onDelete,
}: {
	task?: TacheItem
	onUpdate: (updates: Partial<TacheItem>) => void
	onDelete: () => void
}) {
	const todoCategories = useQuery(api.leadOptions.list, { category: "todo_categorie" })

	const preview = useMemo(() => {
		if (!task?.titre) return ""
		const now = new Date()
		let result = task.titre
		result = result.replace(/\{\{client\}\}/g, "ACME Corp")
		result = result.replace(/\{\{mois\}\}/g, MOIS_FR[now.getMonth()])
		result = result.replace(/\{\{annee\}\}/g, String(now.getFullYear()))
		result = result.replace(/\{\{prestation\}\}/g, "Comptabilité, Paie")
		result = result.replace(/\{\{responsable\}\}/g, "Marie Dupont")
		result = result.replace(/\{\{trimestre\}\}/g, `T${Math.ceil((now.getMonth() + 1) / 3)}`)
		return result
	}, [task?.titre])

	if (!task) return <p className="text-sm text-muted-foreground">Tâche non trouvée</p>

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Titre *</Label>
				<Input
					value={task.titre}
					onChange={(e) => onUpdate({ titre: e.target.value })}
					placeholder="Ex: Déclaration TVA — {{client}} — {{mois}} {{annee}}"
				/>
				<div className="flex flex-wrap gap-1.5">
					{VARIABLE_TAGS.map((tag) => (
						<Badge
							key={tag.label}
							variant="outline"
							className="text-[10px] cursor-pointer hover:bg-muted"
							onClick={() =>
								onUpdate({ titre: `${task.titre}${task.titre ? " " : ""}${tag.label}` })
							}
							title={tag.desc}
						>
							{tag.label}
						</Badge>
					))}
				</div>
			</div>

			{task.titre && (
				<div className="bg-muted/50 border rounded-md px-3 py-2 text-sm">
					<span className="text-xs text-muted-foreground">Aperçu : </span>
					{preview}
				</div>
			)}

			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					value={task.description ?? ""}
					onChange={(e) => onUpdate({ description: e.target.value || undefined })}
					rows={2}
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label className="text-xs">Priorité</Label>
					<Select
						value={task.priorite}
						onValueChange={(v) => onUpdate({ priorite: v as TacheItem["priorite"] })}
					>
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
				<div className="space-y-1.5">
					<Label className="text-xs">Catégorie</Label>
					<Select
						value={task.categorie || "__none__"}
						onValueChange={(v) => onUpdate({ categorie: v === "__none__" ? undefined : v })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Aucune" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">Aucune</SelectItem>
							{todoCategories?.map((cat) => (
								<SelectItem key={cat._id} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Échéance dans (jours après génération)</Label>
				<Input
					type="number"
					min={0}
					value={task.echeanceJoursApres ?? ""}
					onChange={(e) =>
						onUpdate({
							echeanceJoursApres: e.target.value === "" ? undefined : Number(e.target.value),
						})
					}
					placeholder="Laisser vide = pas d'échéance"
				/>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">SOPs associés</Label>
				<SopPicker
					value={(task.sopIds ?? []) as Id<"sops">[]}
					onChange={(ids) => onUpdate({ sopIds: ids as string[] })}
					size="sm"
				/>
			</div>

			<Separator />

			<Button
				variant="outline"
				size="sm"
				className="w-full text-destructive hover:text-destructive"
				onClick={onDelete}
			>
				<Trash2 className="h-3.5 w-3.5 mr-2" />
				Supprimer cette tâche
			</Button>
		</div>
	)
}
