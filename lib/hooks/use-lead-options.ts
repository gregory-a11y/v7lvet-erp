"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback, useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

type LeadOption = {
	_id: Id<"leadOptions">
	category: "source" | "type" | "prestation"
	value: string
	label: string
	color?: string
	order: number
	isDefault: boolean
	isActive: boolean
	createdAt: number
}

export function useLeadOptions(category?: "source" | "type" | "prestation") {
	return useQuery(api.leadOptions.list, category ? { category } : {})
}

export function useAllLeadOptions(category?: "source" | "type" | "prestation") {
	return useQuery(api.leadOptions.listAll, category ? { category } : {})
}

export function useSources() {
	return useLeadOptions("source")
}

export function useTypes() {
	return useLeadOptions("type")
}

export function usePrestations() {
	return useLeadOptions("prestation")
}

export function buildLabelMap(options: LeadOption[] | undefined): Record<string, string> {
	if (!options) return {}
	return Object.fromEntries(options.map((o) => [o.value, o.label]))
}

export function buildColorMap(options: LeadOption[] | undefined): Record<string, string> {
	if (!options) return {}
	return Object.fromEntries(options.filter((o) => o.color).map((o) => [o.value, o.color!]))
}

export function useSourceLabels() {
	const sources = useSources()
	return useMemo(() => buildLabelMap(sources), [sources])
}

export function useTypeLabels() {
	const types = useTypes()
	return useMemo(() => buildLabelMap(types), [types])
}

export function usePrestationLabels() {
	const prestations = usePrestations()
	return useMemo(() => buildLabelMap(prestations), [prestations])
}

export function useCreateLeadOption() {
	const mutate = useMutation(api.leadOptions.create)
	return useCallback(
		(args: {
			category: "source" | "type" | "prestation"
			value: string
			label: string
			color?: string
		}) => mutate(args),
		[mutate],
	)
}

export function useUpdateLeadOption() {
	const mutate = useMutation(api.leadOptions.update)
	return useCallback(
		(args: { id: Id<"leadOptions">; label?: string; color?: string; isActive?: boolean }) =>
			mutate(args),
		[mutate],
	)
}

export function useRemoveLeadOption() {
	const mutate = useMutation(api.leadOptions.remove)
	return useCallback((id: Id<"leadOptions">) => mutate({ id }), [mutate])
}

export function useReorderLeadOptions() {
	const mutate = useMutation(api.leadOptions.reorder)
	return useCallback((ids: Id<"leadOptions">[]) => mutate({ ids }), [mutate])
}

export function useSeedLeadOptions() {
	const mutate = useMutation(api.leadOptions.seed)
	return useCallback(() => mutate({}), [mutate])
}
