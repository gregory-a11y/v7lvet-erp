"use client"

import { useMutation, useQuery } from "convex/react"
import { Check, Hash, MessageSquare, Users } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface NewConversationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	defaultTab?: "dm" | "group" | "client"
	currentUserId: string
	onConversationCreated: (id: Id<"conversations">) => void
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function NewConversationDialog({
	open,
	onOpenChange,
	defaultTab = "dm",
	currentUserId,
	onConversationCreated,
}: NewConversationDialogProps) {
	const members = useQuery(api.equipe.listMembers)
	const clients = useQuery(api.clients.list, {})
	const getOrCreateDirect = useMutation(api.conversations.getOrCreateDirect)
	const createGroup = useMutation(api.conversations.createGroup)
	const createClientChannel = useMutation(api.conversations.createClientChannel)

	const [tab, setTab] = useState<"dm" | "group" | "client">(defaultTab)

	// Sync tab when defaultTab changes (dialog opens with different tab)
	useEffect(() => {
		if (open) setTab(defaultTab)
	}, [defaultTab, open])

	const [search, setSearch] = useState("")
	const [groupName, setGroupName] = useState("")
	const [selectedMembers, setSelectedMembers] = useState<string[]>([])
	const [selectedClient, setSelectedClient] = useState<Id<"clients"> | null>(null)
	const [creating, setCreating] = useState(false)

	const otherMembers = useMemo(() => {
		if (!members) return []
		return members.filter((m) => m.userId !== currentUserId)
	}, [members, currentUserId])

	const filteredMembers = useMemo(() => {
		if (!search) return otherMembers
		const q = search.toLowerCase()
		return otherMembers.filter(
			(m) => m.nom?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q),
		)
	}, [otherMembers, search])

	const filteredClients = useMemo(() => {
		if (!clients) return []
		if (!search) return clients
		const q = search.toLowerCase()
		return clients.filter((c) => c.raisonSociale.toLowerCase().includes(q))
	}, [clients, search])

	const toggleMember = useCallback((userId: string) => {
		setSelectedMembers((prev) =>
			prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
		)
	}, [])

	const reset = useCallback(() => {
		setSearch("")
		setGroupName("")
		setSelectedMembers([])
		setSelectedClient(null)
		setTab(defaultTab)
	}, [defaultTab])

	const handleCreateDm = useCallback(
		async (userId: string) => {
			setCreating(true)
			try {
				const id = await getOrCreateDirect({ otherUserId: userId })
				onConversationCreated(id)
				onOpenChange(false)
				reset()
			} finally {
				setCreating(false)
			}
		},
		[getOrCreateDirect, onConversationCreated, onOpenChange, reset],
	)

	const handleCreateGroup = useCallback(async () => {
		if (!groupName.trim() || selectedMembers.length === 0) return
		setCreating(true)
		try {
			const id = await createGroup({
				name: groupName.trim(),
				memberIds: selectedMembers,
			})
			onConversationCreated(id)
			onOpenChange(false)
			reset()
		} finally {
			setCreating(false)
		}
	}, [groupName, selectedMembers, createGroup, onConversationCreated, onOpenChange, reset])

	const handleCreateClientChannel = useCallback(async () => {
		if (!selectedClient || selectedMembers.length === 0) return
		setCreating(true)
		try {
			const id = await createClientChannel({
				clientId: selectedClient,
				memberIds: selectedMembers,
			})
			onConversationCreated(id)
			onOpenChange(false)
			reset()
		} finally {
			setCreating(false)
		}
	}, [
		selectedClient,
		selectedMembers,
		createClientChannel,
		onConversationCreated,
		onOpenChange,
		reset,
	])

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v)
				if (!v) reset()
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Nouvelle conversation</DialogTitle>
				</DialogHeader>

				<Tabs
					value={tab}
					onValueChange={(v) => {
						setTab(v as typeof tab)
						setSearch("")
						setSelectedMembers([])
						setSelectedClient(null)
					}}
				>
					<TabsList className="w-full">
						<TabsTrigger value="dm" className="flex-1 gap-1.5 text-xs">
							<MessageSquare className="h-3.5 w-3.5" />
							Message
						</TabsTrigger>
						<TabsTrigger value="group" className="flex-1 gap-1.5 text-xs">
							<Users className="h-3.5 w-3.5" />
							Groupe
						</TabsTrigger>
						<TabsTrigger value="client" className="flex-1 gap-1.5 text-xs">
							<Hash className="h-3.5 w-3.5" />
							Client
						</TabsTrigger>
					</TabsList>

					{/* DM tab */}
					<TabsContent value="dm" className="space-y-3">
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher un membre..."
							className="h-8 text-sm"
						/>
						<div className="max-h-64 overflow-y-auto space-y-0.5">
							{filteredMembers.map((m) => (
								<button
									key={m.userId}
									type="button"
									className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted transition-colors"
									onClick={() => handleCreateDm(m.userId)}
									disabled={creating}
								>
									<Avatar size="sm">
										<AvatarFallback className="bg-v7-emeraude/10 text-v7-emeraude text-[10px]">
											{getInitials(m.nom ?? m.email ?? "?")}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 text-left min-w-0">
										<p className="text-sm truncate">{m.nom ?? m.email}</p>
										{m.nom && (
											<p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
										)}
									</div>
									{(m as any).fonctionNom ? (
										<Badge variant="outline" className="text-[10px]">
											{(m as any).fonctionNom}
										</Badge>
									) : (
										<Badge variant="outline" className="text-[10px] capitalize">
											{m.role}
										</Badge>
									)}
								</button>
							))}
							{filteredMembers.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									Aucun membre trouvé
								</p>
							)}
						</div>
					</TabsContent>

					{/* Group tab */}
					<TabsContent value="group" className="space-y-3">
						<Input
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							placeholder="Nom du groupe..."
							className="h-8 text-sm"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher des membres..."
							className="h-8 text-sm"
						/>

						{selectedMembers.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{selectedMembers.map((id) => {
									const m = otherMembers.find((m) => m.userId === id)
									return (
										<Badge
											key={id}
											variant="secondary"
											className="gap-1 cursor-pointer"
											onClick={() => toggleMember(id)}
										>
											{m?.nom ?? m?.email ?? id}
											<span className="text-xs">&times;</span>
										</Badge>
									)
								})}
							</div>
						)}

						<div className="max-h-48 overflow-y-auto space-y-0.5">
							{filteredMembers.map((m) => {
								const isSelected = selectedMembers.includes(m.userId)
								return (
									<button
										key={m.userId}
										type="button"
										className={cn(
											"flex items-center gap-2 w-full px-2 py-2 rounded-md transition-colors",
											isSelected ? "bg-v7-emeraude/5" : "hover:bg-muted",
										)}
										onClick={() => toggleMember(m.userId)}
									>
										<Avatar size="sm">
											<AvatarFallback className="bg-v7-emeraude/10 text-v7-emeraude text-[10px]">
												{getInitials(m.nom ?? m.email ?? "?")}
											</AvatarFallback>
										</Avatar>
										<span className="flex-1 text-sm text-left truncate">{m.nom ?? m.email}</span>
										{isSelected && <Check className="h-4 w-4 text-v7-emeraude shrink-0" />}
									</button>
								)
							})}
						</div>

						<Button
							className="w-full bg-v7-emeraude hover:bg-v7-emeraude/90"
							disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
							onClick={handleCreateGroup}
						>
							Créer le groupe
						</Button>
					</TabsContent>

					{/* Client tab */}
					<TabsContent value="client" className="space-y-3">
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher un client..."
							className="h-8 text-sm"
						/>

						{!selectedClient ? (
							<div className="max-h-48 overflow-y-auto space-y-0.5">
								{filteredClients.map((c) => (
									<button
										key={c._id}
										type="button"
										className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted transition-colors"
										onClick={() => {
											setSelectedClient(c._id)
											setSearch("")
										}}
									>
										<Hash className="h-4 w-4 text-v7-amethyste shrink-0" />
										<span className="text-sm truncate">{c.raisonSociale}</span>
									</button>
								))}
								{filteredClients.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">
										Aucun client trouvé
									</p>
								)}
							</div>
						) : (
							<>
								<div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
									<Hash className="h-4 w-4 text-v7-amethyste" />
									<span className="text-sm flex-1">
										{clients?.find((c) => c._id === selectedClient)?.raisonSociale}
									</span>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 text-xs"
										onClick={() => setSelectedClient(null)}
									>
										Changer
									</Button>
								</div>

								<p className="text-xs text-muted-foreground">Ajouter des membres au canal :</p>

								{selectedMembers.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{selectedMembers.map((id) => {
											const m = otherMembers.find((m) => m.userId === id)
											return (
												<Badge
													key={id}
													variant="secondary"
													className="gap-1 cursor-pointer"
													onClick={() => toggleMember(id)}
												>
													{m?.nom ?? m?.email ?? id}
													<span className="text-xs">&times;</span>
												</Badge>
											)
										})}
									</div>
								)}

								<div className="max-h-36 overflow-y-auto space-y-0.5">
									{otherMembers.map((m) => {
										const isSelected = selectedMembers.includes(m.userId)
										return (
											<button
												key={m.userId}
												type="button"
												className={cn(
													"flex items-center gap-2 w-full px-2 py-2 rounded-md transition-colors",
													isSelected ? "bg-v7-amethyste/5" : "hover:bg-muted",
												)}
												onClick={() => toggleMember(m.userId)}
											>
												<Avatar size="sm">
													<AvatarFallback className="bg-v7-emeraude/10 text-v7-emeraude text-[10px]">
														{getInitials(m.nom ?? m.email ?? "?")}
													</AvatarFallback>
												</Avatar>
												<span className="flex-1 text-sm text-left truncate">
													{m.nom ?? m.email}
												</span>
												{isSelected && <Check className="h-4 w-4 text-v7-amethyste shrink-0" />}
											</button>
										)
									})}
								</div>

								<Button
									className="w-full bg-v7-amethyste hover:bg-v7-amethyste/90"
									disabled={selectedMembers.length === 0 || creating}
									onClick={handleCreateClientChannel}
								>
									Créer le canal client
								</Button>
							</>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
