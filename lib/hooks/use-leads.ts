"use client"

import { useMutation, useQuery } from "convex/react"
import { useCallback } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useLeads(filters?: { statut?: string; responsableId?: string; source?: string }) {
	return useQuery(api.leads.list, filters ?? {})
}

export function useLeadsForKanban() {
	return useQuery(api.leads.listForKanban)
}

export function useLead(id: Id<"leads"> | undefined) {
	return useQuery(api.leads.getById, id ? { id } : "skip")
}

export function useLeadStats() {
	return useQuery(api.leads.stats)
}

export function useSearchLeads(query: string) {
	return useQuery(api.leads.search, query.trim() ? { query } : "skip")
}

export function useCreateLead() {
	const mutate = useMutation(api.leads.create)
	return useCallback(
		(args: {
			contactNom: string
			contactPrenom?: string
			contactEmail?: string
			contactTelephone?: string
			entrepriseRaisonSociale?: string
			entrepriseSiren?: string
			entrepriseFormeJuridique?: string
			entrepriseCA?: number
			entrepriseNbSalaries?: number
			statut?: string
			type?: string
			prestations?: string[]
			source?: string
			sourceDetail?: string
			responsableId?: string
			montantEstime?: number
			notes?: string
		}) => mutate(args as any),
		[mutate],
	)
}

export function useUpdateLead() {
	const mutate = useMutation(api.leads.update)
	return useCallback(
		(args: { id: Id<"leads"> } & Record<string, any>) => mutate(args as any),
		[mutate],
	)
}

export function useMoveToStage() {
	const mutate = useMutation(api.leads.moveToStage)
	return useCallback(
		(args: { id: Id<"leads">; statut: string; raisonPerte?: string }) => mutate(args as any),
		[mutate],
	)
}

export function useReorderLead() {
	const mutate = useMutation(api.leads.reorder)
	return useCallback(
		(args: { id: Id<"leads">; statut: string; newOrder: number }) => mutate(args as any),
		[mutate],
	)
}

export function useMarkAsLost() {
	const mutate = useMutation(api.leads.markAsLost)
	return useCallback((args: { id: Id<"leads">; raisonPerte: string }) => mutate(args), [mutate])
}

export function useConvertToClient() {
	const mutate = useMutation(api.leads.convertToClient)
	return useCallback((args: { id: Id<"leads">; raisonSociale: string }) => mutate(args), [mutate])
}

export function useScheduleRdv() {
	const mutate = useMutation(api.leads.scheduleRdv)
	return useCallback(
		(args: { id: Id<"leads">; rdvType: string; rdvDate: number; rdvNotes?: string }) =>
			mutate(args as any),
		[mutate],
	)
}

export function useDeleteLead() {
	const mutate = useMutation(api.leads.remove)
	return useCallback((id: Id<"leads">) => mutate({ id }), [mutate])
}
