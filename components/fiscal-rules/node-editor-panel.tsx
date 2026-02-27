"use client"

import type { Node } from "@xyflow/react"
import { Ban, CircleDot, FolderTree, GitBranchPlus, ListChecks, Trash2, X } from "lucide-react"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import {
	CLIENT_FIELDS,
	DATE_FORMULA_TYPES,
	getFieldByValue,
	getOperatorsForField,
	MOIS_LABELS,
} from "@/lib/fiscal-rule-fields"

// ─── Types ──────────────────────────────────────────────────────────────────

interface NodeEditorPanelProps {
	node: Node | null
	onUpdateData: (nodeId: string, data: Record<string, unknown>) => void
	onDeleteNode: (nodeId: string) => void
	onClose: () => void
}

const GROUP_OPTIONS = [
	{ value: "IR", label: "IR — Impôt sur le Revenu" },
	{ value: "IS", label: "IS — Impôt sur les Sociétés" },
	{ value: "TVA", label: "TVA — Taxe sur la Valeur Ajoutée" },
	{ value: "CFE", label: "CFE — Cotisation Foncière" },
	{ value: "CVAE", label: "CVAE — Cotisation VA Entreprises" },
	{ value: "TAXES", label: "TAXES — Autres taxes" },
]

// ─── Condition Editor ───────────────────────────────────────────────────────

function ConditionEditor({
	data,
	onChange,
}: {
	data: Record<string, unknown>
	onChange: (data: Record<string, unknown>) => void
}) {
	const champ = (data.champ as string) ?? ""
	const operateur = (data.operateur as string) ?? "equals"
	const valeur = data.valeur

	const field = getFieldByValue(champ)
	const operators = getOperatorsForField(champ)
	const currentOp = operators.find((o) => o.value === operateur)
	const needsValue = currentOp?.needsValue !== false

	const updateField = (key: string, val: unknown) => {
		const updated = { ...data, [key]: val }
		if (key === "champ") {
			updated.operateur = "equals"
			updated.valeur = undefined
		}
		if (key === "operateur") {
			const op = operators.find((o) => o.value === val)
			if (!op?.needsValue) updated.valeur = undefined
		}
		onChange(updated)
	}

	const isArrayOp = operateur === "in" || operateur === "not_in"
	const selectedArray = Array.isArray(valeur) ? (valeur as string[]) : []

	const toggleArrayValue = (v: string) => {
		const newArr = selectedArray.includes(v)
			? selectedArray.filter((x) => x !== v)
			: [...selectedArray, v]
		updateField("valeur", newArr)
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Champ du client</Label>
				<Select value={champ} onValueChange={(v) => updateField("champ", v)}>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Choisir un champ..." />
					</SelectTrigger>
					<SelectContent>
						{CLIENT_FIELDS.map((f) => (
							<SelectItem key={f.value} value={f.value} className="text-xs">
								{f.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Opérateur</Label>
				<Select value={operateur} onValueChange={(v) => updateField("operateur", v)}>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{operators.map((op) => (
							<SelectItem key={op.value} value={op.value} className="text-xs">
								{op.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{needsValue && (
				<div className="space-y-1.5">
					<Label className="text-xs">Valeur</Label>
					{isArrayOp && field?.options ? (
						<div className="flex flex-wrap gap-1.5">
							{field.options.map((opt) => (
								<button
									type="button"
									key={opt.value}
									onClick={() => toggleArrayValue(opt.value)}
									className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
										selectedArray.includes(opt.value)
											? "bg-primary/10 border-primary text-primary font-medium"
											: "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					) : field?.options && !isArrayOp ? (
						<Select
							value={(valeur as string) ?? ""}
							onValueChange={(v) => updateField("valeur", v)}
						>
							<SelectTrigger className="h-9 text-xs">
								<SelectValue placeholder="Choisir..." />
							</SelectTrigger>
							<SelectContent>
								{field.options.map((opt) => (
									<SelectItem key={opt.value} value={opt.value} className="text-xs">
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : field?.type === "number" ? (
						<Input
							type="number"
							className="h-9 text-xs"
							value={(valeur as number) ?? ""}
							onChange={(e) =>
								updateField("valeur", e.target.value === "" ? undefined : Number(e.target.value))
							}
						/>
					) : (
						<Input
							type="text"
							className="h-9 text-xs"
							value={(valeur as string) ?? ""}
							onChange={(e) => updateField("valeur", e.target.value || undefined)}
						/>
					)}
				</div>
			)}
		</div>
	)
}

// ─── Date Formula Editor ────────────────────────────────────────────────────

function DateFormulaEditor({
	formule,
	onChange,
}: {
	formule?: { type: string; params: Record<string, unknown> }
	onChange: (formule: { type: string; params: Record<string, unknown> } | undefined) => void
}) {
	if (!formule) {
		return (
			<Button
				variant="outline"
				size="sm"
				className="w-full text-xs h-8"
				onClick={() => onChange({ type: "fixed", params: { jour: 1, mois: 1 } })}
			>
				+ Ajouter une échéance
			</Button>
		)
	}

	const { type, params } = formule

	const updateType = (newType: string) => {
		const defaultParams: Record<string, Record<string, unknown>> = {
			fixed: { jour: 1, mois: 1, anneeOffset: 0 },
			relative_to_cloture: { moisOffset: 3, joursOffset: 0 },
			cloture_conditional: {
				dateA: { jour: 1, mois: 5, anneeOffset: 1 },
				dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
			},
			end_of_month_plus_offset: { mois: 1, offsetJours: 15 },
			end_of_quarter_plus_offset: { trimestre: 1, offsetJours: 15 },
			relative_to_ago: { moisOffset: 0, joursOffset: 0 },
		}
		onChange({ type: newType, params: defaultParams[newType] ?? {} })
	}

	const updateParam = (key: string, val: unknown) => {
		onChange({ type, params: { ...params, [key]: val } })
	}

	return (
		<div className="space-y-3 rounded-lg border p-3 bg-gray-50/50">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-medium">Formule de date</Label>
				<button
					type="button"
					onClick={() => onChange(undefined)}
					className="text-[10px] text-red-500 hover:text-red-600"
				>
					Retirer
				</button>
			</div>

			<Select value={type} onValueChange={updateType}>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{DATE_FORMULA_TYPES.map((t) => (
						<SelectItem key={t.value} value={t.value} className="text-xs">
							{t.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{type === "fixed" && (
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-[10px] text-muted-foreground">Jour</Label>
							<Input
								type="number"
								min={1}
								max={31}
								className="h-8 text-xs"
								value={(params.jour as number) ?? 1}
								onChange={(e) => updateParam("jour", Number(e.target.value))}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-[10px] text-muted-foreground">Mois</Label>
							<Select
								value={String((params.mois as number) ?? 1)}
								onValueChange={(v) => updateParam("mois", Number(v))}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MOIS_LABELS.map((m, i) => (
										<SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
											{m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={(params.anneeOffset as number) === 1}
							onCheckedChange={(c) => updateParam("anneeOffset", c ? 1 : 0)}
						/>
						<span className="text-[10px] text-muted-foreground">
							{(params.anneeOffset as number) === 1 ? "Exercice + 1" : "Année de l'exercice"}
						</span>
					</div>
				</div>
			)}

			{type === "relative_to_cloture" && (
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Mois après clôture</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.moisOffset as number) ?? 0}
							onChange={(e) => updateParam("moisOffset", Number(e.target.value))}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Jours suppl.</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.joursOffset as number) ?? 0}
							onChange={(e) => updateParam("joursOffset", Number(e.target.value))}
						/>
					</div>
				</div>
			)}

			{type === "cloture_conditional" && (
				<div className="space-y-3">
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground font-medium">
							Si clôture au 31/12 →
						</Label>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-[10px] text-muted-foreground">Jour</Label>
								<Input
									type="number"
									min={1}
									max={31}
									className="h-8 text-xs"
									value={((params.dateA as Record<string, unknown>)?.jour as number) ?? 1}
									onChange={(e) =>
										updateParam("dateA", {
											...(params.dateA as Record<string, unknown>),
											jour: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-[10px] text-muted-foreground">Mois</Label>
								<Select
									value={String(((params.dateA as Record<string, unknown>)?.mois as number) ?? 1)}
									onValueChange={(v) =>
										updateParam("dateA", {
											...(params.dateA as Record<string, unknown>),
											mois: Number(v),
										})
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MOIS_LABELS.map((m, i) => (
											<SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground font-medium">
							Sinon (clôture autre date) →
						</Label>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-[10px] text-muted-foreground">Mois après clôture</Label>
								<Input
									type="number"
									className="h-8 text-xs"
									value={((params.dateB as Record<string, unknown>)?.moisOffset as number) ?? 3}
									onChange={(e) =>
										updateParam("dateB", {
											...(params.dateB as Record<string, unknown>),
											type: "relative_to_cloture",
											moisOffset: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-[10px] text-muted-foreground">Jours suppl.</Label>
								<Input
									type="number"
									className="h-8 text-xs"
									value={((params.dateB as Record<string, unknown>)?.joursOffset as number) ?? 0}
									onChange={(e) =>
										updateParam("dateB", {
											...(params.dateB as Record<string, unknown>),
											type: "relative_to_cloture",
											joursOffset: Number(e.target.value),
										})
									}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{type === "end_of_month_plus_offset" && (
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Mois</Label>
						<Select
							value={String((params.mois as number) ?? 1)}
							onValueChange={(v) => updateParam("mois", Number(v))}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MOIS_LABELS.map((m, i) => (
									<SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">+ jours</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.offsetJours as number) ?? 0}
							onChange={(e) => updateParam("offsetJours", Number(e.target.value))}
						/>
					</div>
				</div>
			)}

			{type === "end_of_quarter_plus_offset" && (
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Trimestre</Label>
						<Select
							value={String((params.trimestre as number) ?? 1)}
							onValueChange={(v) => updateParam("trimestre", Number(v))}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{["T1", "T2", "T3", "T4"].map((t, i) => (
									<SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">+ jours</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.offsetJours as number) ?? 0}
							onChange={(e) => updateParam("offsetJours", Number(e.target.value))}
						/>
					</div>
				</div>
			)}

			{type === "relative_to_ago" && (
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Mois après AGO</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.moisOffset as number) ?? 0}
							onChange={(e) => updateParam("moisOffset", Number(e.target.value))}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px] text-muted-foreground">Jours suppl.</Label>
						<Input
							type="number"
							className="h-8 text-xs"
							value={(params.joursOffset as number) ?? 0}
							onChange={(e) => updateParam("joursOffset", Number(e.target.value))}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

// ─── Task Editor ────────────────────────────────────────────────────────────

function TaskEditor({
	data,
	onChange,
}: {
	data: Record<string, unknown>
	onChange: (data: Record<string, unknown>) => void
}) {
	const nom = (data.nom as string) ?? ""
	const categorie = (data.categorie as string) ?? ""
	const cerfa = (data.cerfa as string) ?? ""
	const dateFormule = data.dateFormule as
		| { type: string; params: Record<string, unknown> }
		| undefined
	const repeat = data.repeat as { frequence: string; moisExclus?: number[] } | undefined
	const hasRepeat = !!repeat

	const updateField = (key: string, val: unknown) => {
		onChange({ ...data, [key]: val })
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Nom de la tâche</Label>
				<Input
					className="h-9 text-xs"
					value={nom}
					onChange={(e) => updateField("nom", e.target.value)}
					placeholder="Ex: Liasse 2065 + IS"
				/>
				<p className="text-[10px] text-muted-foreground">
					Variables : {"{mois}"}, {"{trimestre}"}, {"{q}"}, {"{m}"}
				</p>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Catégorie</Label>
				<Input
					className="h-9 text-xs"
					value={categorie}
					onChange={(e) => updateField("categorie", e.target.value)}
					placeholder="Ex: IS, TVA, IR..."
				/>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">CERFA / Formulaire</Label>
				<Input
					className="h-9 text-xs"
					value={cerfa}
					onChange={(e) => updateField("cerfa", e.target.value)}
					placeholder="Ex: 2065, CA3..."
				/>
			</div>

			<Separator />

			<DateFormulaEditor formule={dateFormule} onChange={(f) => updateField("dateFormule", f)} />

			<Separator />

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label className="text-xs">Récurrence</Label>
					<Switch
						checked={hasRepeat}
						onCheckedChange={(c) => {
							if (c) {
								updateField("repeat", { frequence: "mensuelle", moisExclus: [] })
							} else {
								updateField("repeat", undefined)
							}
						}}
					/>
				</div>

				{hasRepeat && repeat && (
					<div className="space-y-3">
						<Select
							value={repeat.frequence}
							onValueChange={(v) => updateField("repeat", { ...repeat, frequence: v })}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="mensuelle" className="text-xs">
									Mensuelle (12x)
								</SelectItem>
								<SelectItem value="trimestrielle" className="text-xs">
									Trimestrielle (4x)
								</SelectItem>
							</SelectContent>
						</Select>

						<div className="space-y-1.5">
							<Label className="text-[10px] text-muted-foreground">
								Mois exclus (cliquer pour exclure)
							</Label>
							<div className="flex flex-wrap gap-1">
								{MOIS_LABELS.map((m, i) => {
									const excluded = (repeat.moisExclus ?? []).includes(i + 1)
									return (
										<button
											type="button"
											key={m}
											onClick={() => {
												const current = repeat.moisExclus ?? []
												const newExclus = excluded
													? current.filter((x) => x !== i + 1)
													: [...current, i + 1]
												updateField("repeat", { ...repeat, moisExclus: newExclus })
											}}
											className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
												excluded
													? "bg-red-50 border-red-300 text-red-600 line-through"
													: "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
											}`}
										>
											{m.slice(0, 3)}
										</button>
									)
								})}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

// ─── Group Editor ───────────────────────────────────────────────────────────

function GroupEditor({
	data,
	onChange,
}: {
	data: Record<string, unknown>
	onChange: (data: Record<string, unknown>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Label</Label>
				<Input
					className="h-9 text-xs"
					value={(data.label as string) ?? ""}
					onChange={(e) => onChange({ ...data, label: e.target.value })}
				/>
			</div>
			<div className="space-y-1.5">
				<Label className="text-xs">Groupe fiscal</Label>
				<Select
					value={(data.groupe as string) ?? ""}
					onValueChange={(v) => onChange({ ...data, groupe: v })}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GROUP_OPTIONS.map((g) => (
							<SelectItem key={g.value} value={g.value} className="text-xs">
								{g.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

// ─── Start Editor ───────────────────────────────────────────────────────────

function StartEditor({
	data,
	onChange,
}: {
	data: Record<string, unknown>
	onChange: (data: Record<string, unknown>) => void
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Label</Label>
				<Input
					className="h-9 text-xs"
					value={(data.label as string) ?? "Système Fiscal"}
					onChange={(e) => onChange({ ...data, label: e.target.value })}
				/>
			</div>
		</div>
	)
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

const NODE_TYPE_INFO: Record<
	string,
	{ label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	conditionNode: { label: "Condition", icon: GitBranchPlus, color: "text-[#063238]" },
	taskNode: { label: "Tâche", icon: ListChecks, color: "text-[#2E6965]" },
	groupNode: { label: "Groupe", icon: FolderTree, color: "text-[#6242FB]" },
	startNode: { label: "Départ", icon: CircleDot, color: "text-primary" },
	nothingNode: { label: "Fin (rien)", icon: Ban, color: "text-gray-400" },
}

export function NodeEditorPanel({
	node,
	onUpdateData,
	onDeleteNode,
	onClose,
}: NodeEditorPanelProps) {
	const handleChange = useCallback(
		(newData: Record<string, unknown>) => {
			if (node) onUpdateData(node.id, newData)
		},
		[node, onUpdateData],
	)

	if (!node) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<div className="text-center space-y-2">
					<GitBranchPlus className="h-8 w-8 mx-auto text-muted-foreground/30" />
					<p className="text-xs text-muted-foreground">Cliquez sur un noeud pour l'éditer</p>
				</div>
			</div>
		)
	}

	const typeInfo = NODE_TYPE_INFO[node.type ?? ""] ?? {
		label: "Noeud",
		icon: CircleDot,
		color: "text-gray-500",
	}
	const Icon = typeInfo.icon
	const data = node.data as Record<string, unknown>

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<Icon className={`h-4 w-4 ${typeInfo.color}`} />
					<span className="text-sm font-medium">{typeInfo.label}</span>
					<span className="text-[10px] text-muted-foreground font-mono">{node.id}</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-md p-1 hover:bg-gray-100 transition-colors"
				>
					<X className="h-4 w-4 text-muted-foreground" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto px-4 py-4">
				{node.type === "conditionNode" && <ConditionEditor data={data} onChange={handleChange} />}
				{node.type === "taskNode" && <TaskEditor data={data} onChange={handleChange} />}
				{node.type === "groupNode" && <GroupEditor data={data} onChange={handleChange} />}
				{node.type === "startNode" && <StartEditor data={data} onChange={handleChange} />}
				{node.type === "nothingNode" && (
					<p className="text-xs text-muted-foreground italic">
						Noeud terminal — aucune tâche à générer. Connectez ce noeud à une branche NON pour
						indiquer qu'aucune action n'est requise.
					</p>
				)}
			</div>

			{/* Footer */}
			{node.type !== "startNode" && (
				<div className="border-t px-4 py-3">
					<Button
						variant="ghost"
						size="sm"
						className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
						onClick={() => onDeleteNode(node.id)}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Supprimer ce noeud
					</Button>
				</div>
			)}
		</div>
	)
}
