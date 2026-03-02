"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { format, isToday, isYesterday } from "date-fns"
import { fr } from "date-fns/locale/fr"
import {
	ArrowLeft,
	Bell,
	BellOff,
	FileText,
	Hash,
	Loader2,
	MessageSquare,
	Plus,
	Users,
	Video,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useConnections } from "@/lib/hooks/use-calendar"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import {
	useDeleteMessage,
	useEditMessage,
	useMarkAsRead,
	useMessages,
	useSendMessage,
	useTyping,
} from "@/lib/hooks/use-messaging"
import { DocumentRequestDialog } from "./document-request-dialog"
import { FileHistoryPanel } from "./file-history-panel"
import { MemberListPopover } from "./member-list-popover"
import { MessageBubble, type MessageData } from "./message-bubble"
import { MessageInput } from "./message-input"
import { TypingIndicator } from "./typing-indicator"

interface ChatPanelProps {
	conversationId: Id<"conversations"> | null
	currentUserId: string
	onBack?: () => void
}

function formatDateSeparator(timestamp: number): string {
	const date = new Date(timestamp)
	if (isToday(date)) return "Aujourd'hui"
	if (isYesterday(date)) return "Hier"
	return format(date, "EEEE d MMMM yyyy", { locale: fr })
}

function shouldShowDateSeparator(
	current: { createdAt: number },
	previous: { createdAt: number } | undefined,
): boolean {
	if (!previous) return true
	const currentDate = new Date(current.createdAt).toDateString()
	const previousDate = new Date(previous.createdAt).toDateString()
	return currentDate !== previousDate
}

export function ChatPanel({ conversationId, currentUserId, onBack }: ChatPanelProps) {
	const { user } = useCurrentUser()
	const optimisticUser = useMemo(
		() =>
			user
				? {
						id: user.id,
						nom: user.name ?? user.email ?? null,
						email: user.email ?? null,
						avatarUrl: user.image ?? null,
					}
				: undefined,
		[user],
	)
	const conversation = useQuery(
		api.conversations.getById,
		conversationId ? { conversationId } : "skip",
	)
	const { messages, isLoading } = useMessages(conversationId)
	const sendMessage = useSendMessage(optimisticUser)
	const editMessage = useEditMessage()
	const deleteMessage = useDeleteMessage()
	const markAsRead = useMarkAsRead()
	const toggleMute = useMutation(api.conversations.toggleMute)
	const { typingUsers, onKeystroke } = useTyping(conversationId)
	const { connections } = useConnections()
	const createInstantMeeting = useAction(api.calendar.createInstantMeeting)

	const [showFiles, setShowFiles] = useState(false)
	const [showDocRequest, setShowDocRequest] = useState(false)
	const [creatingMeeting, setCreatingMeeting] = useState(false)

	const scrollRef = useRef<HTMLDivElement>(null)
	const bottomRef = useRef<HTMLDivElement>(null)

	// Scroll to bottom on new messages or initial load
	const messageCount = messages.length
	// biome-ignore lint/correctness/useExhaustiveDependencies: messageCount is an intentional trigger
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "instant" })
	}, [messageCount])

	// Mark as read when opening conversation
	useEffect(() => {
		if (conversationId) {
			markAsRead({ conversationId })
		}
	}, [conversationId, markAsRead])

	const handleSend = useCallback(
		async (
			content: string,
			attachments?: { storageId: string; nom: string; mimeType: string; fileSize: number }[],
		) => {
			if (!conversationId) return
			const args = {
				conversationId,
				content: content || " ",
				type: (attachments ? "file" : "text") as "text" | "file",
				attachments,
			}
			// Scroll immédiat vers le bas après envoi (optimistic msg already visible)
			requestAnimationFrame(() => {
				bottomRef.current?.scrollIntoView({ behavior: "smooth" })
			})
			try {
				await sendMessage(args)
			} catch {
				toast.error("Échec de l'envoi", {
					action: {
						label: "Réessayer",
						onClick: () => handleSend(content, attachments),
					},
				})
			}
		},
		[conversationId, sendMessage],
	)

	const handleEdit = useCallback(
		(messageId: string, content: string) => {
			editMessage({ messageId: messageId as Id<"messages">, content })
		},
		[editMessage],
	)

	const handleDelete = useCallback(
		(messageId: string) => {
			deleteMessage({ messageId: messageId as Id<"messages"> })
		},
		[deleteMessage],
	)

	const activeConnection = connections?.find((c) => c.isActive)
	const meetingProvider = activeConnection?.provider

	const handleCreateMeeting = useCallback(async () => {
		if (!conversationId || creatingMeeting) return
		setCreatingMeeting(true)
		try {
			const result = await createInstantMeeting({ conversationId })
			const label = result.provider === "google" ? "Google Meet" : "Microsoft Teams"
			toast.success(`Visio ${label} créée`, {
				action: {
					label: "Rejoindre",
					onClick: () => window.open(result.videoUrl, "_blank"),
				},
			})
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la création de la visio")
		} finally {
			setCreatingMeeting(false)
		}
	}, [conversationId, creatingMeeting, createInstantMeeting])

	if (!conversationId) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
				<MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
				<p className="text-sm text-muted-foreground">Sélectionnez une conversation</p>
			</div>
		)
	}

	// Sorted oldest-first for display
	const sortedMessages = [...messages].reverse()

	const displayName =
		conversation?.name ??
		(conversation?.type === "direct"
			? (conversation?.members?.find((m) => m.userId !== currentUserId)?.nom ?? "Conversation")
			: "Conversation")

	const conversationType = conversation?.type
	const isMuted = conversation?.isMuted ?? false

	return (
		<div className="flex-1 flex flex-col h-full bg-white">
			{/* Header */}
			<div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
				{onBack && (
					<Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
				)}

				<div className="flex items-center gap-2 flex-1 min-w-0">
					{conversationType === "client" && <Hash className="h-4 w-4 text-v7-amethyste shrink-0" />}
					{conversationType === "group" && <Users className="h-4 w-4 text-v7-emeraude shrink-0" />}
					<h3 className="font-medium text-sm truncate">{displayName}</h3>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{meetingProvider && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground"
							onClick={handleCreateMeeting}
							disabled={creatingMeeting}
							title={meetingProvider === "google" ? "Créer Google Meet" : "Créer Microsoft Teams"}
						>
							{creatingMeeting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Video className="h-4 w-4" />
							)}
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
						onClick={() => setShowFiles(true)}
						title="Fichiers partagés"
					>
						<FileText className="h-4 w-4" />
					</Button>
					{conversationType === "client" && (
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-xs gap-1 text-v7-amethyste"
							onClick={() => setShowDocRequest(true)}
						>
							<Plus className="h-3.5 w-3.5" />
							Document
						</Button>
					)}
					{conversationId && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground"
							onClick={() => toggleMute({ conversationId })}
						>
							{isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
						</Button>
					)}
					{conversation?.members && (
						<MemberListPopover
							members={conversation.members}
							memberCount={conversation.members.length}
						/>
					)}
				</div>
			</div>

			{/* Messages — anchored to bottom like classic chat apps */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto">
				<div className="min-h-full flex flex-col justify-end py-4 space-y-1">
					{isLoading ? (
						<div className="flex items-center justify-center py-20">
							<p className="text-sm text-muted-foreground">Chargement...</p>
						</div>
					) : sortedMessages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20">
							<MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
							<p className="text-sm text-muted-foreground">
								Aucun message. Commencez la conversation !
							</p>
						</div>
					) : (
						sortedMessages.map((msg, i) => {
							const prev = i > 0 ? sortedMessages[i - 1] : undefined
							const showDate = shouldShowDateSeparator(msg, prev)
							const showSender = !prev || prev.senderId !== msg.senderId || showDate

							return (
								<div key={msg._id}>
									{showDate && (
										<div className="flex items-center gap-3 py-3 px-4">
											<Separator className="flex-1" />
											<span className="text-xs text-muted-foreground shrink-0">
												{formatDateSeparator(msg.createdAt)}
											</span>
											<Separator className="flex-1" />
										</div>
									)}
									<MessageBubble
										message={msg as MessageData}
										isOwn={msg.senderId === currentUserId}
										showSender={showSender}
										onEdit={handleEdit}
										onDelete={handleDelete}
									/>
								</div>
							)
						})
					)}
					<div ref={bottomRef} />
				</div>
			</div>

			{/* Typing indicator */}
			<TypingIndicator typingUsers={typingUsers} />

			{/* Input */}
			<MessageInput onSend={handleSend} onKeystroke={onKeystroke} />

			{/* File history panel */}
			<FileHistoryPanel
				conversationId={conversationId}
				open={showFiles}
				onOpenChange={setShowFiles}
			/>

			{/* Document request dialog (client channels only) */}
			{conversationType === "client" && conversation?.clientId && (
				<DocumentRequestDialog
					conversationId={conversationId!}
					clientId={conversation.clientId}
					open={showDocRequest}
					onOpenChange={setShowDocRequest}
				/>
			)}
		</div>
	)
}
