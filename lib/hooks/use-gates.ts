import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function usePendingGates() {
	return useQuery(api.gates.listPending)
}

export function usePendingGateCount() {
	return useQuery(api.gates.pendingCount) ?? 0
}

export function useGatesByRun(runId: Id<"runs">) {
	return useQuery(api.gates.listByRun, { runId })
}

export function useGateByTache(tacheId: Id<"taches">) {
	return useQuery(api.gates.getByTache, { tacheId })
}

export function useValidateGate() {
	return useMutation(api.gates.validate)
}

export function useRejectGate() {
	return useMutation(api.gates.reject)
}
