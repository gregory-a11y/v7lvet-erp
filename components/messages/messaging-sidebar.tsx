"use client"

import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { Id } from "@/convex/_generated/dataModel"
import { ConversationItem, type ConversationItemData } from "./conversation-item"
import { SectionHeader } from "./section-header"

interface MessagingSidebarProps {
	conversations:
		| {
				dms: ConversationItemData[]
				groups: ConversationItemData[]
				clients: ConversationItemData[]
		  }
		| undefined
	isLoading: boolean
	activeId: Id<"conversations"> | null
	currentUserId: string
	onSelect: (id: Id<"conversations">) => void
	onNewConversation: (tab?: "dm" | "group" | "client") => void
}

export function MessagingSidebar({
	conversations,
	isLoading,
	activeId,
	currentUserId,
	onSelect,
	onNewConversation,
}: MessagingSidebarProps) {
	const [search, setSearch] = useState("")
	const [openSections, setOpenSections] = useState({
		dms: true,
		groups: true,
		clients: true,
	})

	const toggleSection = (key: keyof typeof openSections) => {
		setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
	}

	const filtered = useMemo(() => {
		if (!conversations) return undefined
		if (!search) return conversations

		const q = search.toLowerCase()
		const filterFn = (c: ConversationItemData) =>
			c.name?.toLowerCase().includes(q) || c.lastMessagePreview?.toLowerCase().includes(q)

		return {
			dms: conversations.dms.filter(filterFn),
			groups: conversations.groups.filter(filterFn),
			clients: conversations.clients.filter(filterFn),
		}
	}, [conversations, search])

	const unreadCounts = useMemo(() => {
		if (!conversations) return { dms: 0, groups: 0, clients: 0 }
		return {
			dms: conversations.dms.reduce((acc, c) => acc + c.unreadCount, 0),
			groups: conversations.groups.reduce((acc, c) => acc + c.unreadCount, 0),
			clients: conversations.clients.reduce((acc, c) => acc + c.unreadCount, 0),
		}
	}, [conversations])

	if (isLoading || !filtered) {
		return (
			<div className="flex flex-col h-full">
				<div className="p-3 border-b">
					<h2 className="font-heading text-sm tracking-widest uppercase mb-3">Messages</h2>
					<Skeleton className="h-8 w-full" />
				</div>
				<div className="space-y-2 p-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-start gap-3">
							<Skeleton className="h-8 w-8 rounded-full shrink-0" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-24" />
								<Skeleton className="h-3 w-36" />
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	const renderSection = (
		key: "dms" | "groups" | "clients",
		title: string,
		items: ConversationItemData[],
		tab: "dm" | "group" | "client",
	) => (
		<div key={key}>
			<SectionHeader
				title={title}
				unreadCount={unreadCounts[key]}
				isOpen={openSections[key]}
				onToggle={() => toggleSection(key)}
				onAdd={() => onNewConversation(tab)}
			/>
			{openSections[key] && (
				<div className="space-y-0.5 px-1">
					{items.length === 0 ? (
						<p className="text-xs text-muted-foreground px-3 py-2">
							{search ? "Aucun résultat" : "Aucune conversation"}
						</p>
					) : (
						items.map((conv) => (
							<ConversationItem
								key={conv._id}
								conversation={conv}
								isActive={activeId === conv._id}
								currentUserId={currentUserId}
								onClick={() => onSelect(conv._id as Id<"conversations">)}
							/>
						))
					)}
				</div>
			)}
		</div>
	)

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 space-y-3 border-b">
				<h2 className="font-heading text-sm tracking-widest uppercase">Messages</h2>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher..."
						className="pl-8 h-8 text-sm"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto py-2 space-y-1">
				{renderSection("dms", "Messages directs", filtered.dms, "dm")}
				{renderSection("groups", "Groupes", filtered.groups, "group")}
				{renderSection("clients", "Canaux clients", filtered.clients, "client")}
			</div>
		</div>
	)
}
