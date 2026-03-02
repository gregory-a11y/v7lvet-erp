"use client"

import { Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Member {
	userId: string
	nom: string | null
	email: string | null
	role: string | null
	isOnline: boolean
	fonctionNom?: string | null
}

interface MemberListPopoverProps {
	members: Member[]
	memberCount: number
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function MemberListPopover({ members, memberCount }: MemberListPopoverProps) {
	const sortedMembers = [...members].sort((a, b) => {
		if (a.isOnline && !b.isOnline) return -1
		if (!a.isOnline && b.isOnline) return 1
		return (a.nom ?? "").localeCompare(b.nom ?? "")
	})

	const onlineCount = members.filter((m) => m.isOnline).length

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
					<Users className="h-4 w-4" />
					<span className="text-xs">{memberCount}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-2" align="end">
				<div className="mb-2 px-2">
					<p className="text-xs font-medium text-muted-foreground">
						{onlineCount} en ligne sur {memberCount}
					</p>
				</div>
				<div className="space-y-0.5 max-h-64 overflow-y-auto">
					{sortedMembers.map((member) => {
						const name = member.nom ?? member.email ?? "Inconnu"
						return (
							<div key={member.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
								<div className="relative">
									<Avatar size="sm">
										<AvatarFallback className="bg-v7-emeraude/10 text-v7-emeraude text-[10px]">
											{getInitials(name)}
										</AvatarFallback>
									</Avatar>
									<span
										className={cn(
											"absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white",
											member.isOnline ? "bg-green-500" : "bg-gray-300",
										)}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm truncate">{name}</p>
									{member.fonctionNom ? (
										<p className="text-[10px] text-muted-foreground italic">{member.fonctionNom}</p>
									) : member.role ? (
										<p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
									) : null}
								</div>
							</div>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
	)
}
