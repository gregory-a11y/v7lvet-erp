import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useTeamEvents(start: number, end: number) {
	const events = useQuery(api.calendar.listTeamEvents, { start, end })
	return { events, isLoading: events === undefined }
}

export function useCreateEvent() {
	return useMutation(api.calendar.createEvent)
}

export function useConnections() {
	const connections = useQuery(api.calendar.listConnections)
	return { connections, isLoading: connections === undefined }
}

export function useSyncOnLoad() {
	const syncGoogle = useAction(api.calendarSync.requestGoogleSync)
	const syncMicrosoft = useAction(api.calendarSync.requestMicrosoftSync)
	return { syncGoogle, syncMicrosoft }
}
