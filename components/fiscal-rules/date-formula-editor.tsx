"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { DATE_FORMULA_TYPES } from "@/lib/fiscal-rule-fields"

interface DateFormula {
	type: string
	params: Record<string, unknown>
}

interface DateFormulaEditorProps {
	formule: DateFormula
	onChange: (formule: DateFormula) => void
}

export function DateFormulaEditor({ formule, onChange }: DateFormulaEditorProps) {
	function updateParams(updates: Record<string, unknown>) {
		onChange({ ...formule, params: { ...formule.params, ...updates } })
	}

	return (
		<div className="space-y-2">
			<Label className="text-[10px] text-muted-foreground">Formule de date</Label>
			<Select value={formule.type} onValueChange={(v) => onChange({ type: v, params: {} })}>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{DATE_FORMULA_TYPES.map((t) => (
						<SelectItem key={t.value} value={t.value}>
							{t.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{formule.type === "fixed" && (
				<div className="grid grid-cols-3 gap-2">
					<div>
						<Label className="text-[10px] text-muted-foreground">Jour</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							value={String(formule.params.jour ?? "")}
							onChange={(e) => updateParams({ jour: Number(e.target.value) })}
						/>
					</div>
					<div>
						<Label className="text-[10px] text-muted-foreground">Mois</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							min={1}
							max={12}
							value={String(formule.params.mois ?? "")}
							onChange={(e) => updateParams({ mois: Number(e.target.value) })}
						/>
					</div>
					<div>
						<Label className="text-[10px] text-muted-foreground">Année +</Label>
						<Select
							value={String(formule.params.anneeOffset ?? "0")}
							onValueChange={(v) => updateParams({ anneeOffset: Number(v) })}
						>
							<SelectTrigger className="h-7 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">N</SelectItem>
								<SelectItem value="1">N+1</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			{formule.type === "relative_to_cloture" && (
				<div className="grid grid-cols-2 gap-2">
					<div>
						<Label className="text-[10px] text-muted-foreground">Mois offset</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							value={String(formule.params.moisOffset ?? 0)}
							onChange={(e) => updateParams({ moisOffset: Number(e.target.value) })}
						/>
					</div>
					<div>
						<Label className="text-[10px] text-muted-foreground">Jours offset</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							value={String(formule.params.joursOffset ?? 0)}
							onChange={(e) => updateParams({ joursOffset: Number(e.target.value) })}
						/>
					</div>
				</div>
			)}

			{formule.type === "end_of_month_plus_offset" && (
				<div>
					<Label className="text-[10px] text-muted-foreground">
						Offset jours (ou jourTVA client)
					</Label>
					<Input
						type="number"
						className="h-7 text-xs"
						value={String(formule.params.offsetJours ?? 0)}
						onChange={(e) => updateParams({ offsetJours: Number(e.target.value) })}
					/>
				</div>
			)}

			{formule.type === "end_of_quarter_plus_offset" && (
				<div>
					<Label className="text-[10px] text-muted-foreground">
						Offset jours (ou jourTVA client)
					</Label>
					<Input
						type="number"
						className="h-7 text-xs"
						value={String(formule.params.offsetJours ?? 0)}
						onChange={(e) => updateParams({ offsetJours: Number(e.target.value) })}
					/>
				</div>
			)}

			{formule.type === "relative_to_ago" && (
				<div className="grid grid-cols-2 gap-2">
					<div>
						<Label className="text-[10px] text-muted-foreground">Mois après AGO</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							value={String(formule.params.moisOffset ?? 0)}
							onChange={(e) => updateParams({ moisOffset: Number(e.target.value) })}
						/>
					</div>
					<div>
						<Label className="text-[10px] text-muted-foreground">Jours offset</Label>
						<Input
							type="number"
							className="h-7 text-xs"
							value={String(formule.params.joursOffset ?? 0)}
							onChange={(e) => updateParams({ joursOffset: Number(e.target.value) })}
						/>
					</div>
				</div>
			)}

			{formule.type === "cloture_conditional" && (
				<p className="text-[10px] text-muted-foreground italic">
					Configuration avancée — modifiable dans le JSON brut
				</p>
			)}
		</div>
	)
}
