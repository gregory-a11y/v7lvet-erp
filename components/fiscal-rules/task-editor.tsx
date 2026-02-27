"use client"

import { Trash2 } from "lucide-react"
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
import { DateFormulaEditor } from "./date-formula-editor"

interface TaskDef {
	nom: string
	categorie?: string
	cerfa?: string
	dateFormule: { type: string; params: Record<string, unknown> }
	repeat?: { frequence: string; moisExclus?: number[] }
}

interface TaskEditorProps {
	tasks: TaskDef[]
	onChange: (tasks: TaskDef[]) => void
}

export function TaskEditor({ tasks, onChange }: TaskEditorProps) {
	function updateTask(index: number, updates: Partial<TaskDef>) {
		const next = [...tasks]
		next[index] = { ...next[index], ...updates }
		onChange(next)
	}

	function removeTask(index: number) {
		onChange(tasks.filter((_, i) => i !== index))
	}

	function addTask() {
		onChange([
			...tasks,
			{
				nom: "Nouvelle tâche",
				categorie: "TAXES",
				dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
			},
		])
	}

	return (
		<div className="space-y-4">
			{tasks.map((task, i) => (
				<div key={i} className="rounded-lg border p-3 space-y-3 bg-muted/30">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-medium">Tâche {i + 1}</Label>
						<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTask(i)}>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label className="text-[10px] text-muted-foreground">Nom</Label>
							<Input
								className="h-8 text-xs"
								value={task.nom}
								onChange={(e) => updateTask(i, { nom: e.target.value })}
							/>
						</div>
						<div>
							<Label className="text-[10px] text-muted-foreground">Catégorie</Label>
							<Select
								value={task.categorie ?? ""}
								onValueChange={(v) => updateTask(i, { categorie: v || undefined })}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Catégorie..." />
								</SelectTrigger>
								<SelectContent>
									{["IR", "IS", "TVA", "TAXES"].map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label className="text-[10px] text-muted-foreground">Cerfa</Label>
						<Input
							className="h-8 text-xs"
							value={task.cerfa ?? ""}
							onChange={(e) => updateTask(i, { cerfa: e.target.value || undefined })}
							placeholder="Ex: 2035, 2572..."
						/>
					</div>

					<DateFormulaEditor
						formule={task.dateFormule}
						onChange={(f) => updateTask(i, { dateFormule: f })}
					/>

					<div className="flex items-center gap-2">
						<Checkbox
							checked={!!task.repeat}
							onCheckedChange={(checked) => {
								if (checked) {
									updateTask(i, { repeat: { frequence: "mensuelle" } })
								} else {
									const next = { ...task }
									delete next.repeat
									updateTask(i, next)
								}
							}}
						/>
						<Label className="text-xs">Récurrente</Label>
						{task.repeat && (
							<Select
								value={task.repeat.frequence}
								onValueChange={(v) => updateTask(i, { repeat: { ...task.repeat!, frequence: v } })}
							>
								<SelectTrigger className="w-[130px] h-7 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="mensuelle">Mensuelle</SelectItem>
									<SelectItem value="trimestrielle">Trimestrielle</SelectItem>
								</SelectContent>
							</Select>
						)}
					</div>
				</div>
			))}
			<Button variant="outline" size="sm" className="text-xs" onClick={addTask}>
				+ Tâche
			</Button>
		</div>
	)
}
