"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useRef } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useConversations() {
	const conversations = useQuery(api.conversations.listMyConversations)
	return { conversations, isLoading: conversations === undefined }
}

export function useMessages(conversationId: Id<"conversations"> | null) {
	const result = useQuery(
		api.messages.listByConversation,
		conversationId ? { conversationId } : "skip",
	)
	return {
		messages: result?.messages ?? [],
		hasMore: result?.hasMore ?? false,
		isLoading: result === undefined && conversationId !== null,
	}
}

export function useSendMessage() {
	const send = useMutation(api.messages.send)
	return send
}

export function useEditMessage() {
	const edit = useMutation(api.messages.edit)
	return edit
}

export function useDeleteMessage() {
	const del = useMutation(api.messages.deleteMessage)
	return del
}

export function useMarkAsRead() {
	const mark = useMutation(api.conversations.markAsRead)
	return mark
}

export function useTyping(conversationId: Id<"conversations"> | null) {
	const setTyping = useMutation(api.typingIndicators.setTyping)
	const clearTyping = useMutation(api.typingIndicators.clearTyping)
	const typingUsers = useQuery(
		api.typingIndicators.getTyping,
		conversationId ? { conversationId } : "skip",
	)

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const prevConversationRef = useRef<Id<"conversations"> | null>(null)

	// Clear typing indicator when switching conversations
	useEffect(() => {
		const prev = prevConversationRef.current
		if (prev && prev !== conversationId) {
			clearTyping({ conversationId: prev })
		}
		prevConversationRef.current = conversationId
	}, [conversationId, clearTyping])

	const onKeystroke = useCallback(() => {
		if (!conversationId) return
		setTyping({ conversationId })

		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(() => {
			clearTyping({ conversationId })
		}, 3000)
	}, [conversationId, setTyping, clearTyping])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [])

	return { typingUsers: typingUsers ?? [], onKeystroke }
}
