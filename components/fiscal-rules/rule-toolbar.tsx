"use client"

import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RuleToolbarProps {
	onSave: () => void
	saving: boolean
}

export function RuleToolbar({ onSave, saving }: RuleToolbarProps) {
	return (
		<div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
			<Button size="sm" onClick={onSave} disabled={saving}>
				<Save className="mr-2 h-3 w-3" />
				{saving ? "Sauvegarde..." : "Sauvegarder"}
			</Button>
		</div>
	)
}
