"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback, useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

/** Active prestations (for selectors) */
export function usePrestationsCatalog() {
	return useQuery(api.prestations.list)
}

/** All prestations including archived (admin) */
export function useAllPrestationsCatalog() {
	return useQuery(api.prestations.listAll)
}

export function usePrestationById(id: Id<"prestations"> | undefined) {
	return useQuery(api.prestations.getById, id ? { id } : "skip")
}

/** Map of prestation ID → titre for display */
export function usePrestationNamesMap(): Record<string, string> {
	const prestations = usePrestationsCatalog()
	return useMemo(() => {
		if (!prestations) return {}
		return Object.fromEntries(prestations.map((p) => [p._id, p.titre]))
	}, [prestations])
}

export function useCreatePrestation() {
	const mutate = useMutation(api.prestations.create)
	return useCallback(
		(args: {
			titre: string
			description?: string
			items: Array<{ nom: string; description?: string }>
		}) => mutate(args),
		[mutate],
	)
}

export function useUpdatePrestation() {
	const mutate = useMutation(api.prestations.update)
	return useCallback(
		(args: {
			id: Id<"prestations">
			titre?: string
			description?: string
			items?: Array<{ nom: string; description?: string }>
		}) => mutate(args),
		[mutate],
	)
}

export function useArchivePrestation() {
	const mutate = useMutation(api.prestations.archive)
	return useCallback((id: Id<"prestations">) => mutate({ id }), [mutate])
}

export function useReactivatePrestation() {
	const mutate = useMutation(api.prestations.reactivate)
	return useCallback((id: Id<"prestations">) => mutate({ id }), [mutate])
}

export function useReorderPrestations() {
	const mutate = useMutation(api.prestations.reorder)
	return useCallback((ids: Id<"prestations">[]) => mutate({ ids }), [mutate])
}
