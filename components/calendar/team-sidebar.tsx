"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const MEMBER_COLORS = [
	"#2E6965", // emerald (self)
	"#6242FB", // amethyste
	"#E67E22", // orange
	"#E74C3C", // rouge
	"#3498DB", // bleu
	"#9B59B6", // violet
	"#1ABC9C", // turquoise
	"#F39C12", // jaune
]

interface TeamSidebarProps {
	currentUserId: string | null
	selectedMembers: Set<string>
	memberColors: Record<string, string>
	onToggleMember: (userId: string) => void
}

export function TeamSidebar({
	currentUserId,
	selectedMembers,
	memberColors,
	onToggleMember,
}: TeamSidebarProps) {
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

	// Sort: current user first, then alphabetically
	const sorted = [...members].sort((a, b) => {
		if (a.userId === currentUserId) return -1
		if (b.userId === currentUserId) return 1
		return (a.nom ?? a.email ?? "").localeCompare(b.nom ?? b.email ?? "")
	})

	return (
		<div className="space-y-3">
			<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Équipe</p>
			<div className="space-y-2">
				{sorted.map((member) => {
					const checkId = `team-filter-${member.userId}`
					const isSelf = member.userId === currentUserId
					const color = memberColors[member.userId] ?? "#2E6965"
					return (
						<div key={member._id} className="flex items-center gap-2 text-sm">
							<Checkbox
								id={checkId}
								checked={selectedMembers.has(member.userId)}
								onCheckedChange={() => onToggleMember(member.userId)}
							/>
							<span
								className="h-2.5 w-2.5 rounded-full shrink-0"
								style={{ backgroundColor: color }}
							/>
							<label htmlFor={checkId} className="truncate cursor-pointer">
								{member.nom ?? member.email ?? "—"}
								{isSelf && <span className="text-muted-foreground ml-1">(moi)</span>}
							</label>
						</div>
					)
				})}
			</div>
		</div>
	)
}

export { MEMBER_COLORS }
