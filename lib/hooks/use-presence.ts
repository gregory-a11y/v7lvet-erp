"use client"

import { useMutation, useQuery } from "convex/react"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"

const HEARTBEAT_INTERVAL = 30_000 // 30 seconds

export function usePresenceHeartbeat() {
	const heartbeat = useMutation(api.presence.heartbeat)

	useEffect(() => {
		// Send initial heartbeat
		heartbeat()

		// Send heartbeat periodically
		const interval = setInterval(() => {
			heartbeat()
		}, HEARTBEAT_INTERVAL)

		// Send heartbeat on visibility change (tab focus)
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				heartbeat()
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			clearInterval(interval)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}, [heartbeat])
}

export function useOnlineUsers() {
	return useQuery(api.presence.listOnline) ?? []
}

export function useIsUserOnline(userId: string | undefined) {
	const onlineUsers = useOnlineUsers()
	if (!userId) return false
	return onlineUsers.find((u) => u.userId === userId)?.isOnline ?? false
}
