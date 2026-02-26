"use client"

import { usePresenceHeartbeat } from "@/lib/hooks/use-presence"

export function PresenceProvider({ children }: { children: React.ReactNode }) {
	usePresenceHeartbeat()
	return <>{children}</>
}
