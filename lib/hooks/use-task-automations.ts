"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useTaskAutomations() {
	return useQuery(api.taskAutomations.list)
}

export function useTaskAutomation(id: Id<"taskAutomations"> | undefined) {
	return useQuery(api.taskAutomations.getById, id ? { id } : "skip")
}

export function useTaskAutomationLogs(automationId: Id<"taskAutomations"> | undefined) {
	return useQuery(api.taskAutomations.listLogs, automationId ? { automationId } : "skip")
}

export function useCreateTaskAutomation() {
	const mutate = useMutation(api.taskAutomations.create)
	return useCallback((args: Parameters<typeof mutate>[0]) => mutate(args), [mutate])
}

export function useUpdateTaskAutomation() {
	const mutate = useMutation(api.taskAutomations.update)
	return useCallback((args: Parameters<typeof mutate>[0]) => mutate(args), [mutate])
}

export function useRemoveTaskAutomation() {
	const mutate = useMutation(api.taskAutomations.remove)
	return useCallback((id: Id<"taskAutomations">) => mutate({ id }), [mutate])
}

export function useToggleTaskAutomation() {
	const mutate = useMutation(api.taskAutomations.toggleActive)
	return useCallback((id: Id<"taskAutomations">) => mutate({ id }), [mutate])
}
