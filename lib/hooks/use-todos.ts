"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useTodos(filters?: {
	statut?: "a_faire" | "en_cours" | "termine"
	priorite?: "basse" | "normale" | "haute" | "urgente"
	assigneId?: string
	clientId?: Id<"clients">
	categorie?: string
	search?: string
}) {
	return useQuery(api.todos.list, filters ?? {})
}

export function useTodo(id: Id<"todos"> | undefined) {
	return useQuery(api.todos.getById, id ? { id } : "skip")
}

export function useTodoStats() {
	return useQuery(api.todos.stats)
}

export function useMyTodos() {
	return useQuery(api.todos.myTodos)
}

export function useTodoComments(todoId: Id<"todos"> | undefined) {
	return useQuery(api.todoComments.listByTodo, todoId ? { todoId } : "skip")
}

export function useCreateTodo() {
	const mutate = useMutation(api.todos.create)
	return useCallback(
		(args: {
			titre: string
			description?: string
			statut?: "a_faire" | "en_cours" | "termine"
			priorite?: "basse" | "normale" | "haute" | "urgente"
			dateEcheance?: number
			assigneId?: string
			categorie?: string
			clientId?: Id<"clients">
			parentId?: Id<"todos">
			tags?: string[]
			sopIds?: Id<"sops">[]
		}) => mutate(args),
		[mutate],
	)
}

export function useUpdateTodo() {
	const mutate = useMutation(api.todos.update)
	return useCallback(
		(args: { id: Id<"todos"> } & Record<string, unknown>) => mutate(args as any),
		[mutate],
	)
}

export function useUpdateTodoStatut() {
	const mutate = useMutation(api.todos.updateStatut)
	return useCallback(
		(args: { id: Id<"todos">; statut: "a_faire" | "en_cours" | "termine" | "archive" }) =>
			mutate(args),
		[mutate],
	)
}

export function useRemoveTodo() {
	const mutate = useMutation(api.todos.remove)
	return useCallback((id: Id<"todos">) => mutate({ id }), [mutate])
}

export function useCreateTodoComment() {
	const mutate = useMutation(api.todoComments.create)
	return useCallback((args: { todoId: Id<"todos">; contenu: string }) => mutate(args), [mutate])
}

export function useUpdateTodoComment() {
	const mutate = useMutation(api.todoComments.update)
	return useCallback((args: { id: Id<"todoComments">; contenu: string }) => mutate(args), [mutate])
}

export function useRemoveTodoComment() {
	const mutate = useMutation(api.todoComments.remove)
	return useCallback((id: Id<"todoComments">) => mutate({ id }), [mutate])
}

export function useGenerateTodoUploadUrl() {
	return useMutation(api.todos.generateUploadUrl)
}
