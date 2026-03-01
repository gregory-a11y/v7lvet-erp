"use client"

import type { OptimisticLocalStore } from "convex/browser"
import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useRef } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface OptimisticUserInfo {
	id: string
	nom: string | null
	email: string | null
	avatarUrl?: string | null
}

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

export function useSendMessage(currentUser?: OptimisticUserInfo) {
	const send = useMutation(api.messages.send).withOptimisticUpdate(
		(
			localStore: OptimisticLocalStore,
			args: {
				conversationId: Id<"conversations">
				content: string
				type?: "text" | "file" | "system"
				attachments?: { storageId: string; nom: string; mimeType: string; fileSize: number }[]
			},
		) => {
			if (!currentUser) return

			const existing = localStore.getQuery(api.messages.listByConversation, {
				conversationId: args.conversationId,
			})
			if (!existing) return

			const now = Date.now()
			const optimisticMsg = {
				_id: `optimistic_${now}` as Id<"messages">,
				_creationTime: now,
				conversationId: args.conversationId,
				senderId: currentUser.id,
				content: args.content,
				type: args.type ?? ("text" as const),
				attachments: args.attachments,
				createdAt: now,
				senderName: currentUser.nom,
				senderEmail: currentUser.email,
				senderAvatarUrl: currentUser.avatarUrl ?? null,
				status: "sending" as const,
			}

			// "sending" status is local-only; Convex will replace with real data on confirmation
			const messages = [optimisticMsg, ...existing.messages] as any
			localStore.setQuery(
				api.messages.listByConversation,
				{ conversationId: args.conversationId },
				{ messages, hasMore: existing.hasMore },
			)
		},
	)
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
