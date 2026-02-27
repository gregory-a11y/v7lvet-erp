"use client"

import { useQuery } from "convex/react"
import { CalendarDays, Play } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function RulePreviewPanel() {
	const clients = useQuery(api.clients.list, { status: "actif" })
	const [clientId, setClientId] = useState<string>("")
	const [exercice, setExercice] = useState(new Date().getFullYear())
	const [showPreview, setShowPreview] = useState(false)

	const tasks = useQuery(
		api.fiscalRules.preview,
		showPreview && clientId ? { clientId: clientId as Id<"clients">, exercice } : "skip",
	)

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-heading tracking-wide">Preview</h3>

			<div className="space-y-2">
				<div>
					<Label className="text-xs">Client</Label>
					<Select
						value={clientId}
						onValueChange={(v) => {
							setClientId(v)
							setShowPreview(false)
						}}
					>
						<SelectTrigger className="h-8 text-xs">
							<SelectValue placeholder="Choisir un client..." />
						</SelectTrigger>
						<SelectContent>
							{clients?.map((c: { _id: string; raisonSociale: string }) => (
								<SelectItem key={c._id} value={c._id}>
									{c.raisonSociale}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label className="text-xs">Exercice</Label>
					<Input
						type="number"
						className="h-8 text-xs"
						value={exercice}
						onChange={(e) => {
							setExercice(Number(e.target.value))
							setShowPreview(false)
						}}
					/>
				</div>

				<Button
					size="sm"
					className="w-full"
					onClick={() => setShowPreview(true)}
					disabled={!clientId}
				>
					<Play className="mr-2 h-3 w-3" />
					Simuler
				</Button>
			</div>

			{showPreview && tasks !== undefined && (
				<div className="space-y-1">
					<p className="text-xs font-medium">
						{tasks.length} tâche{tasks.length !== 1 ? "s" : ""} générée
						{tasks.length !== 1 ? "s" : ""}
					</p>
					<div className="max-h-[400px] overflow-y-auto space-y-1">
						{tasks.map(
							(
								t: { nom: string; categorie?: string; cerfa?: string; dateEcheance?: number },
								i: number,
							) => (
								<div key={i} className="rounded border px-2 py-1.5 text-xs">
									<p className="font-medium">{t.nom}</p>
									<div className="flex items-center gap-1 mt-0.5">
										{t.categorie && (
											<Badge variant="outline" className="text-[9px] px-1 py-0">
												{t.categorie}
											</Badge>
										)}
										{t.dateEcheance && (
											<span className="flex items-center gap-0.5 text-muted-foreground">
												<CalendarDays className="h-2.5 w-2.5" />
												{new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
											</span>
										)}
									</div>
								</div>
							),
						)}
					</div>
				</div>
			)}
		</div>
	)
}
