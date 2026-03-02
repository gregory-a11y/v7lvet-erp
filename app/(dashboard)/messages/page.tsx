"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { ChatPanel } from "@/components/messages/chat-panel"
import { MessagingSidebar } from "@/components/messages/messaging-sidebar"
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUserContext } from "@/lib/contexts/current-user"
import { useConversationsByType } from "@/lib/hooks/use-messaging"

export default function MessagesPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { user } = useCurrentUserContext()
	const { dms, groups, clients, isLoading } = useConversationsByType()

	const conversationParam = searchParams.get("conversation")
	const activeConversationId = conversationParam ? (conversationParam as Id<"conversations">) : null

	const [showNewDialog, setShowNewDialog] = useState(false)
	const [newDialogTab, setNewDialogTab] = useState<"dm" | "group" | "client">("dm")
	const [mobileShowChat, setMobileShowChat] = useState(!!activeConversationId)

	const currentUserId = ((user as Record<string, unknown>)?.id as string) ?? ""

	const handleSelectConversation = useCallback(
		(id: Id<"conversations">) => {
			router.push(`/messages?conversation=${id}`, { scroll: false })
			setMobileShowChat(true)
		},
		[router],
	)

	const handleBack = useCallback(() => {
		setMobileShowChat(false)
		router.push("/messages", { scroll: false })
	}, [router])

	const handleConversationCreated = useCallback(
		(id: Id<"conversations">) => {
			handleSelectConversation(id)
		},
		[handleSelectConversation],
	)

	const handleNewConversation = useCallback((tab?: "dm" | "group" | "client") => {
		setNewDialogTab(tab ?? "dm")
		setShowNewDialog(true)
	}, [])

	return (
		<div className="flex h-[calc(100vh-3.5rem)]">
			{/* Sidebar — hidden on mobile when chat is shown */}
			<div className={`w-full lg:w-80 lg:border-r lg:block ${mobileShowChat ? "hidden" : "block"}`}>
				<MessagingSidebar
					conversations={isLoading ? undefined : { dms, groups, clients }}
					isLoading={isLoading}
					activeId={activeConversationId}
					currentUserId={currentUserId}
					onSelect={handleSelectConversation}
					onNewConversation={handleNewConversation}
				/>
			</div>

			{/* Chat panel — hidden on mobile when list is shown */}
			<div className={`flex-1 lg:block ${mobileShowChat ? "block" : "hidden"}`}>
				<ChatPanel
					conversationId={activeConversationId}
					currentUserId={currentUserId}
					onBack={handleBack}
				/>
			</div>

			<NewConversationDialog
				open={showNewDialog}
				onOpenChange={setShowNewDialog}
				defaultTab={newDialogTab}
				currentUserId={currentUserId}
				onConversationCreated={handleConversationCreated}
			/>
		</div>
	)
}
