"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell } from "lucide-react"

function timeAgo(timestamp: number): string {
	const now = Date.now()
	const diff = now - timestamp
	const minutes = Math.floor(diff / 60000)
	const hours = Math.floor(diff / 3600000)
	const days = Math.floor(diff / 86400000)

	if (minutes < 1) return "a l'instant"
	if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`
	if (hours < 24) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`
	return `il y a ${days} jour${days > 1 ? "s" : ""}`
}

export function NotificationBell() {
	const notifications = useQuery(api.notifications.listForUser)
	const unreadCount = useQuery(api.notifications.unreadCount)
	const markAsRead = useMutation(api.notifications.markAsRead)
	const markAllAsRead = useMutation(api.notifications.markAllAsRead)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{(unreadCount ?? 0) > 0 && (
						<Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
							{unreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h4 className="text-sm font-semibold">Notifications</h4>
					{(unreadCount ?? 0) > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-xs h-auto py-1 px-2"
							onClick={() => markAllAsRead()}
						>
							Tout marquer comme lu
						</Button>
					)}
				</div>
				<div className="max-h-80 overflow-y-auto">
					{!notifications || notifications.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							Aucune notification
						</p>
					) : (
						notifications.map((n) => (
							<div
								key={n._id}
								className={`flex flex-col gap-1 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-muted/30" : ""}`}
								onClick={() => {
									if (!n.isRead) markAsRead({ id: n._id })
								}}
							>
								<div className="flex items-start justify-between gap-2">
									<span className="text-sm font-medium leading-tight">
										{n.titre}
									</span>
									{!n.isRead && (
										<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
									)}
								</div>
								<p className="text-xs text-muted-foreground line-clamp-2">
									{n.message}
								</p>
								<span className="text-[11px] text-muted-foreground/70">
									{timeAgo(n.createdAt)}
								</span>
							</div>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}
