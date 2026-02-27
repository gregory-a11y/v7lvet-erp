"use client"

import { Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Id } from "@/convex/_generated/dataModel"
import { ConversationItem, type ConversationItemData } from "./conversation-item"

interface ConversationListProps {
	conversations: ConversationItemData[] | undefined
	activeId: Id<"conversations"> | null
	currentUserId: string
	onSelect: (id: Id<"conversations">) => void
	onNewConversation: () => void
}

type FilterTab = "all" | "direct" | "group" | "client"

export function ConversationList({
	conversations,
	activeId,
	currentUserId,
	onSelect,
	onNewConversation,
}: ConversationListProps) {
	const [search, setSearch] = useState("")
	const [filter, setFilter] = useState<FilterTab>("all")

	const filtered = useMemo(() => {
		if (!conversations) return undefined
		let result = conversations

		if (filter !== "all") {
			result = result.filter((c) => c.type === filter)
		}

		if (search) {
			const q = search.toLowerCase()
			result = result.filter((c) => {
				if (c.name?.toLowerCase().includes(q)) return true
				if (c.lastMessagePreview?.toLowerCase().includes(q)) return true
				return false
			})
		}

		return result
	}, [conversations, filter, search])

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 space-y-3 border-b">
				<div className="flex items-center justify-between">
					<h2 className="font-heading text-sm tracking-widest uppercase">Messages</h2>
					<Button size="icon" variant="ghost" className="h-7 w-7" onClick={onNewConversation}>
						<Plus className="h-4 w-4" />
					</Button>
				</div>

				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher..."
						className="pl-8 h-8 text-sm"
					/>
				</div>

				<Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
					<TabsList className="w-full h-7">
						<TabsTrigger value="all" className="text-xs h-6 flex-1">
							Tous
						</TabsTrigger>
						<TabsTrigger value="direct" className="text-xs h-6 flex-1">
							DMs
						</TabsTrigger>
						<TabsTrigger value="group" className="text-xs h-6 flex-1">
							Groupes
						</TabsTrigger>
						<TabsTrigger value="client" className="text-xs h-6 flex-1">
							Clients
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="flex-1 overflow-y-auto p-2 space-y-0.5">
				{filtered === undefined ? (
					<div className="space-y-2 p-2">
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
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center px-4">
						<p className="text-sm text-muted-foreground">
							{search ? "Aucun résultat" : "Aucune conversation"}
						</p>
					</div>
				) : (
					filtered.map((conv) => (
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
		</div>
	)
}
