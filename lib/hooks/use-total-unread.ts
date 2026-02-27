"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useTotalUnread(): number {
	const conversations = useQuery(api.conversations.listMyConversations)
	if (!conversations) return 0
	return conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
}
