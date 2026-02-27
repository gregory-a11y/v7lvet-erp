"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

export interface Participant {
	type: "team" | "client" | "external"
	userId?: string
	email?: string
	name?: string
	status: "pending" | "accepted" | "declined" | "tentative"
}

interface ParticipantPickerProps {
	participants: Participant[]
	onChange: (participants: Participant[]) => void
}

export function ParticipantPicker({ participants, onChange }: ParticipantPickerProps) {
	const { members } = useTeamMembers()
	const [mode, setMode] = useState<"team" | "external">("team")
	const [externalEmail, setExternalEmail] = useState("")
	const [externalName, setExternalName] = useState("")

	const addTeamMember = (userId: string) => {
		if (participants.some((p) => p.userId === userId)) return
		const member = members?.find((m) => m.userId === userId)
		onChange([
			...participants,
			{
				type: "team",
				userId,
				name: member?.nom ?? member?.email ?? undefined,
				status: "pending",
			},
		])
	}

	const addExternal = () => {
		if (!externalEmail.trim()) return
		if (participants.some((p) => p.email === externalEmail.trim())) return
		onChange([
			...participants,
			{
				type: "external",
				email: externalEmail.trim(),
				name: externalName.trim() || undefined,
				status: "pending",
			},
		])
		setExternalEmail("")
		setExternalName("")
	}

	const removeParticipant = (index: number) => {
		onChange(participants.filter((_, i) => i !== index))
	}

	const availableMembers = members?.filter((m) => !participants.some((p) => p.userId === m.userId))

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Select value={mode} onValueChange={(v) => setMode(v as "team" | "external")}>
					<SelectTrigger className="w-32 h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="team">Équipe</SelectItem>
						<SelectItem value="external">Externe</SelectItem>
					</SelectContent>
				</Select>

				{mode === "team" ? (
					<Select onValueChange={addTeamMember}>
						<SelectTrigger className="flex-1 h-8 text-xs">
							<SelectValue placeholder="Ajouter un membre..." />
						</SelectTrigger>
						<SelectContent>
							{availableMembers?.map((m) => (
								<SelectItem key={m.userId} value={m.userId}>
									{m.nom ?? m.email ?? "—"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="flex flex-1 gap-2">
						<Input
							placeholder="Email"
							value={externalEmail}
							onChange={(e) => setExternalEmail(e.target.value)}
							className="h-8 text-xs flex-1"
						/>
						<Input
							placeholder="Nom (optionnel)"
							value={externalName}
							onChange={(e) => setExternalName(e.target.value)}
							className="h-8 text-xs w-32"
						/>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={addExternal}
						>
							<Plus className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}
			</div>

			{participants.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{participants.map((p, i) => (
						<Badge
							key={`${p.userId ?? p.email}-${i}`}
							variant="secondary"
							className="gap-1 text-xs pr-1"
						>
							{p.name ?? p.email ?? p.userId}
							<button
								type="button"
								onClick={() => removeParticipant(i)}
								className="ml-0.5 hover:text-destructive"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	)
}
