"use client"

import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { BellOff, Hash, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ConversationMember {
	nom: string | null
	email: string | null
	userId: string
	isOnline?: boolean
	avatarUrl?: string | null
}

export interface ConversationItemData {
	_id: string
	type: "direct" | "group" | "client"
	name?: string
	lastMessagePreview?: string
	lastMessageAt?: number
	createdAt: number
	unreadCount: number
	isMuted: boolean
	members?: ConversationMember[]
}

interface ConversationItemProps {
	conversation: ConversationItemData
	isActive: boolean
	currentUserId: string
	onClick: () => void
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

function getConversationDisplayName(conv: ConversationItemData, currentUserId: string): string {
	if (conv.name) return conv.name
	if (conv.type === "direct" && conv.members) {
		const other = conv.members.find((m) => m.userId !== currentUserId)
		return other?.nom ?? other?.email ?? "Conversation"
	}
	return "Conversation"
}

export function ConversationItem({
	conversation,
	isActive,
	currentUserId,
	onClick,
}: ConversationItemProps) {
	const displayName = getConversationDisplayName(conversation, currentUserId)
	const timestamp = conversation.lastMessageAt ?? conversation.createdAt

	const isDirectOnline =
		conversation.type === "direct" &&
		conversation.members?.some((m) => m.userId !== currentUserId && m.isOnline)

	const typeIcon =
		conversation.type === "group" ? (
			<Users className="h-3 w-3" />
		) : conversation.type === "client" ? (
			<Hash className="h-3 w-3" />
		) : null

	const otherMemberAvatar =
		conversation.type === "direct"
			? conversation.members?.find((m) => m.userId !== currentUserId)?.avatarUrl
			: undefined

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full flex items-start gap-3 px-3 py-3 text-left rounded-lg transition-colors hover:bg-muted/50",
				isActive && "bg-primary/5 border border-primary/20",
			)}
		>
			<div className="relative shrink-0">
				<Avatar size="default">
					{otherMemberAvatar && <AvatarImage src={otherMemberAvatar} alt={displayName} />}
					<AvatarFallback
						className={cn(
							conversation.type === "client"
								? "bg-v7-amethyste/10 text-v7-amethyste"
								: "bg-v7-emeraude/10 text-v7-emeraude",
						)}
					>
						{conversation.type === "direct" ? (
							getInitials(displayName)
						) : conversation.type === "client" ? (
							<Hash className="h-4 w-4" />
						) : (
							<Users className="h-4 w-4" />
						)}
					</AvatarFallback>
				</Avatar>
				{isDirectOnline && (
					<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						{typeIcon}
						<span
							className={cn(
								"text-sm truncate",
								conversation.unreadCount > 0
									? "font-semibold text-foreground"
									: "font-medium text-foreground/80",
							)}
						>
							{displayName}
						</span>
						{conversation.isMuted && <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />}
					</div>
					<span className="text-xs text-muted-foreground shrink-0">
						{formatDistanceToNow(new Date(timestamp), {
							addSuffix: true,
							locale: fr,
						})}
					</span>
				</div>

				<div className="flex items-center justify-between gap-2 mt-0.5">
					<p className="text-xs text-muted-foreground truncate">
						{conversation.lastMessagePreview ?? "Aucun message"}
					</p>
					{conversation.unreadCount > 0 && (
						<Badge className="h-5 min-w-5 px-1.5 text-xs bg-v7-emeraude text-white shrink-0">
							{conversation.unreadCount}
						</Badge>
					)}
				</div>
			</div>
		</button>
	)
}
