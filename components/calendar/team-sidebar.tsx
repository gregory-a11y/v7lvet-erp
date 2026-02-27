"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

interface TeamSidebarProps {
	selectedMembers: Set<string>
	onToggleMember: (userId: string) => void
}

export function TeamSidebar({ selectedMembers, onToggleMember }: TeamSidebarProps) {
	const { members, isLoading } = useTeamMembers()

	if (isLoading) {
		return (
			<div className="space-y-3">
				<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Équipe</p>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={`skeleton-${i}`} className="h-5 w-full animate-pulse rounded bg-muted" />
				))}
			</div>
		)
	}

	if (!members?.length) return null

	return (
		<div className="space-y-3">
			<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Équipe</p>
			<div className="space-y-2">
				{members.map((member) => {
					const checkId = `team-filter-${member.userId}`
					return (
						<div key={member._id} className="flex items-center gap-2 text-sm">
							<Checkbox
								id={checkId}
								checked={selectedMembers.has(member.userId)}
								onCheckedChange={() => onToggleMember(member.userId)}
							/>
							<label htmlFor={checkId} className="truncate cursor-pointer">
								{member.nom ?? member.email ?? "—"}
							</label>
						</div>
					)
				})}
			</div>
		</div>
	)
}
