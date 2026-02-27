"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	CLIENT_FIELDS,
	getFieldByValue,
	getOperatorsForField,
	OPERATORS,
} from "@/lib/fiscal-rule-fields"

interface Condition {
	champ: string
	operateur: string
	valeur?: unknown
}

interface ConditionEditorProps {
	conditions: Condition[]
	onChange: (conditions: Condition[]) => void
}

export function ConditionEditor({ conditions, onChange }: ConditionEditorProps) {
	function updateCondition(index: number, updates: Partial<Condition>) {
		const next = [...conditions]
		next[index] = { ...next[index], ...updates }
		// Reset valeur when changing champ or operateur
		if (updates.champ && updates.champ !== conditions[index].champ) {
			next[index].operateur = "equals"
			next[index].valeur = undefined
		}
		onChange(next)
	}

	function removeCondition(index: number) {
		onChange(conditions.filter((_, i) => i !== index))
	}

	function addCondition() {
		onChange([
			...conditions,
			{ champ: CLIENT_FIELDS[0].value, operateur: "equals", valeur: undefined },
		])
	}

	return (
		<div className="space-y-2">
			{conditions.map((cond, i) => {
				const field = getFieldByValue(cond.champ)
				const ops = getOperatorsForField(cond.champ)
				const op = OPERATORS.find((o) => o.value === cond.operateur)

				return (
					<div key={i} className="flex items-center gap-2">
						<Select value={cond.champ} onValueChange={(v) => updateCondition(i, { champ: v })}>
							<SelectTrigger className="w-[160px] h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CLIENT_FIELDS.map((f) => (
									<SelectItem key={f.value} value={f.value}>
										{f.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={cond.operateur}
							onValueChange={(v) => updateCondition(i, { operateur: v })}
						>
							<SelectTrigger className="w-[100px] h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ops.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{op?.needsValue &&
							(field?.options ? (
								<Select
									value={String(cond.valeur ?? "")}
									onValueChange={(v) => updateCondition(i, { valeur: v })}
								>
									<SelectTrigger className="w-[140px] h-8 text-xs">
										<SelectValue placeholder="Valeur..." />
									</SelectTrigger>
									<SelectContent>
										{field.options.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : field?.type === "number" ? (
								<Input
									type="number"
									className="w-[100px] h-8 text-xs"
									value={String(cond.valeur ?? "")}
									onChange={(e) =>
										updateCondition(i, {
											valeur: e.target.value ? Number(e.target.value) : undefined,
										})
									}
								/>
							) : (
								<Input
									className="w-[140px] h-8 text-xs"
									value={String(cond.valeur ?? "")}
									onChange={(e) => updateCondition(i, { valeur: e.target.value || undefined })}
								/>
							))}

						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => removeCondition(i)}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				)
			})}
			<Button variant="outline" size="sm" className="text-xs" onClick={addCondition}>
				+ Condition
			</Button>
		</div>
	)
}
