"use client"

import dynamic from "next/dynamic"
import { NewLeadDialog } from "@/components/leads/new-lead-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const KanbanBoard = dynamic(
	() => import("@/components/leads/kanban-board").then((m) => m.KanbanBoard),
	{
		loading: () => <Skeleton className="h-96 w-full" />,
		ssr: false,
	},
)

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
