"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useDocumentRequests(conversationId: Id<"conversations"> | null) {
	const requests = useQuery(
		api.documentRequests.listByConversation,
		conversationId ? { conversationId } : "skip",
	)
	return { requests: requests ?? [], isLoading: requests === undefined && conversationId !== null }
}

export function useDocumentRequestsByClient(clientId: Id<"clients"> | null) {
	const requests = useQuery(api.documentRequests.listByClient, clientId ? { clientId } : "skip")
	return { requests: requests ?? [], isLoading: requests === undefined && clientId !== null }
}

export function useDocumentRequest(id: Id<"documentRequests"> | null) {
	const request = useQuery(api.documentRequests.getById, id ? { id } : "skip")
	return { request: request ?? null, isLoading: request === undefined && id !== null }
}

export function useCreateDocumentRequest() {
	return useMutation(api.documentRequests.create)
}

export function useRespondDocumentRequest() {
	return useMutation(api.documentRequests.respond)
}

export function useUpdateDocumentRequestStatus() {
	return useMutation(api.documentRequests.updateStatus)
}
