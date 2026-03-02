"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"

const RAISONS = [
	"Prix trop élevé",
	"Concurrent choisi",
	"Pas de besoin immédiat",
	"Pas de réponse / injoignable",
	"Projet abandonné",
	"Hors périmètre",
	"Autre",
]

interface LostReasonDialogProps {
	open: boolean
	onConfirm: (raison: string) => void
	onCancel: () => void
}

export function LostReasonDialog({ open, onConfirm, onCancel }: LostReasonDialogProps) {
	const [selected, setSelected] = useState("")
	const [detail, setDetail] = useState("")

	const handleConfirm = () => {
		const raison = selected === "Autre" && detail.trim() ? detail.trim() : selected
		if (!raison) return
		onConfirm(raison)
		setSelected("")
		setDetail("")
	}

	const handleCancel = () => {
		setSelected("")
		setDetail("")
		onCancel()
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Marquer comme perdu</DialogTitle>
					<DialogDescription>Indiquez la raison pour laquelle ce lead est perdu.</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Raison de perte</Label>
						<Select value={selected} onValueChange={setSelected}>
							<SelectTrigger>
								<SelectValue placeholder="Sélectionner une raison..." />
							</SelectTrigger>
							<SelectContent>
								{RAISONS.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selected === "Autre" && (
						<div className="space-y-2">
							<Label>Détail</Label>
							<Textarea
								value={detail}
								onChange={(e) => setDetail(e.target.value)}
								placeholder="Précisez la raison..."
								rows={3}
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Annuler
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!selected || (selected === "Autre" && !detail.trim())}
					>
						Confirmer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
