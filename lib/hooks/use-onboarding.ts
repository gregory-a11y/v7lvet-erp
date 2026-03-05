"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// ─── Templates (admin) ──────────────────────────────────────────────────────

export function useOnboardingTemplates() {
	return useQuery(api.onboardingTemplates.list)
}

export function useCreateOnboardingTemplate() {
	const mutate = useMutation(api.onboardingTemplates.create)
	return useCallback(
		(args: { nom: string; description?: string; ordre: number }) => mutate(args),
		[mutate],
	)
}

export function useUpdateOnboardingTemplate() {
	const mutate = useMutation(api.onboardingTemplates.update)
	return useCallback(
		(args: {
			id: Id<"onboardingTemplates">
			nom?: string
			description?: string
			ordre?: number
			isActive?: boolean
		}) => mutate(args),
		[mutate],
	)
}

export function useDeleteOnboardingTemplate() {
	const mutate = useMutation(api.onboardingTemplates.remove)
	return useCallback((id: Id<"onboardingTemplates">) => mutate({ id }), [mutate])
}

export function useSeedOnboardingTemplates() {
	const mutate = useMutation(api.onboardingTemplates.seedDefaults)
	return useCallback(() => mutate({}), [mutate])
}

// ─── Onboarding Todos (via table todos) ─────────────────────────────────────

export function useOnboardingTodos(leadId: Id<"leads"> | undefined) {
	return useQuery(api.todos.listByLead, leadId ? { leadId, categorie: "onboarding" } : "skip")
}

export function useOnboardingOverview() {
	return useQuery(api.todos.onboardingOverview)
}

// ─── Legacy onboarding tasks (for cleanup) ──────────────────────────────────

export function useOldOnboardingTasks(leadId: Id<"leads"> | undefined) {
	return useQuery(api.onboardingTasks.listByLead, leadId ? { leadId } : "skip")
}

export function useDeleteOldOnboardingTask() {
	const mutate = useMutation(api.onboardingTasks.remove)
	return useCallback((id: Id<"onboardingTasks">) => mutate({ id }), [mutate])
}

// Re-export legacy for backward compat (components that still import old names)
export function useOnboardingTasks(leadId: Id<"leads"> | undefined) {
	return useOnboardingTodos(leadId)
}

export function useUpdateOnboardingTask() {
	const mutate = useMutation(api.todos.updateStatut)
	return useCallback(
		(args: { id: Id<"todos">; statut: "a_faire" | "en_cours" | "termine" | "archive" }) =>
			mutate(args),
		[mutate],
	)
}

export function useGenerateOnboardingTasks() {
	const mutate = useMutation(api.onboardingTasks.generateForLead)
	return useCallback((leadId: Id<"leads">) => mutate({ leadId }), [mutate])
}
