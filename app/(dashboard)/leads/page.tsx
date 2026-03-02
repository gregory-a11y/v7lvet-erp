"use client"

import { KanbanBoard } from "@/components/leads/kanban-board"
import { NewLeadDialog } from "@/components/leads/new-lead-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

export default function LeadsPage() {
	const { members } = useTeamMembers()
	const teamMembers = members?.map((m) => ({ userId: m.userId, nom: m.nom }))

	return (
		<div className="flex flex-col h-full">
			<PageHeader
				title="Pipeline"
				description="Gestion des leads et du pipeline commercial"
				actions={<NewLeadDialog teamMembers={teamMembers} />}
			/>
			<div className="flex-1 overflow-hidden">
				<KanbanBoard teamMembers={teamMembers} />
			</div>
		</div>
	)
}
