"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { Check, CheckCheck, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { FileAttachment } from "./file-attachment"

interface Attachment {
	storageId: string
	nom: string
	mimeType: string
	fileSize: number
}

export interface MessageData {
	_id: string
	senderId: string
	senderName: string | null
	senderEmail: string | null
	senderAvatarUrl?: string | null
	content: string
	type: "text" | "file" | "system"
	attachments?: Attachment[]
	isEdited?: boolean
	isDeleted?: boolean
	createdAt: number
	status?: "sending" | "sent" | "read"
}

function MessageStatus({ status }: { status?: "sending" | "sent" | "read" }) {
	if (!status) return null
	switch (status) {
		case "sending":
			return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />
		case "sent":
			return <Check className="h-3 w-3 text-muted-foreground" />
		case "read":
			return <CheckCheck className="h-3 w-3 text-v7-emeraude" />
	}
}

interface MessageBubbleProps {
	message: MessageData
	isOwn: boolean
	showSender: boolean
	onEdit?: (messageId: string, content: string) => void
	onDelete?: (messageId: string) => void
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function MessageBubble({
	message,
	isOwn,
	showSender,
	onEdit,
	onDelete,
}: MessageBubbleProps) {
	const [editing, setEditing] = useState(false)
	const [editContent, setEditContent] = useState(message.content)
	const [menuOpen, setMenuOpen] = useState(false)

	if (message.type === "system") {
		return (
			<div className="flex justify-center py-2">
				<span className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-1 rounded-full">
					{message.content}
				</span>
			</div>
		)
	}

	if (message.isDeleted) {
		return (
			<div className={cn("flex gap-2 px-4", isOwn ? "justify-end" : "")}>
				<div className="px-3 py-2 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
					<span className="text-xs text-muted-foreground italic">Message supprimé</span>
				</div>
			</div>
		)
	}

	const senderName = message.senderName ?? message.senderEmail ?? "Inconnu"

	const handleSaveEdit = () => {
		if (editContent.trim() && editContent !== message.content) {
			onEdit?.(message._id, editContent.trim())
		}
		setEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSaveEdit()
		}
		if (e.key === "Escape") {
			setEditing(false)
			setEditContent(message.content)
		}
	}

	return (
		<div className={cn("flex gap-2 px-4 group", isOwn ? "flex-row-reverse" : "")}>
			{!isOwn && showSender && (
				<Avatar size="sm" className="mt-1">
					{message.senderAvatarUrl && (
						<AvatarImage src={message.senderAvatarUrl} alt={senderName} />
					)}
					<AvatarFallback className="bg-v7-emeraude/10 text-v7-emeraude text-xs">
						{getInitials(senderName)}
					</AvatarFallback>
				</Avatar>
			)}
			{!isOwn && !showSender && <div className="w-6 shrink-0" />}

			<div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
				{showSender && !isOwn && (
					<span className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
						{senderName}
					</span>
				)}

				<div className="flex items-end gap-1 group/bubble">
					{isOwn && (
						<Popover open={menuOpen} onOpenChange={setMenuOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0"
								>
									<MoreHorizontal className="h-3.5 w-3.5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-36 p-1" align="end">
								<button
									type="button"
									className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
									onClick={() => {
										setEditing(true)
										setEditContent(message.content)
										setMenuOpen(false)
									}}
								>
									<Pencil className="h-3.5 w-3.5" />
									Modifier
								</button>
								<button
									type="button"
									className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
									onClick={() => {
										onDelete?.(message._id)
										setMenuOpen(false)
									}}
								>
									<Trash2 className="h-3.5 w-3.5" />
									Supprimer
								</button>
							</PopoverContent>
						</Popover>
					)}

					<div
						className={cn(
							"px-3 py-2 rounded-2xl text-sm leading-relaxed",
							isOwn ? "bg-v7-emeraude text-white rounded-br-md" : "bg-muted rounded-bl-md",
							message.status === "sending" && "opacity-70",
						)}
					>
						{editing ? (
							<div className="space-y-1">
								<textarea
									value={editContent}
									onChange={(e) => setEditContent(e.target.value)}
									onKeyDown={handleKeyDown}
									className="w-full bg-transparent outline-none resize-none text-sm min-w-[200px]"
									rows={2}
									ref={(el) => el?.focus()}
								/>
								<div className="flex justify-end gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5"
										onClick={() => {
											setEditing(false)
											setEditContent(message.content)
										}}
									>
										<span className="text-xs">Esc</span>
									</Button>
									<Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveEdit}>
										<Check className="h-3 w-3" />
									</Button>
								</div>
							</div>
						) : (
							<span className="whitespace-pre-wrap break-words">{message.content}</span>
						)}
					</div>

					{!isOwn && (
						<Popover open={menuOpen} onOpenChange={setMenuOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0"
								>
									<MoreHorizontal className="h-3.5 w-3.5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-36 p-1" align="start">
								<button
									type="button"
									className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
									onClick={() => {
										onDelete?.(message._id)
										setMenuOpen(false)
									}}
								>
									<Trash2 className="h-3.5 w-3.5" />
									Supprimer
								</button>
							</PopoverContent>
						</Popover>
					)}
				</div>

				{message.attachments && message.attachments.length > 0 && (
					<div className="mt-1 space-y-1">
						{message.attachments.map((att) => (
							<FileAttachment key={att.storageId} attachment={att} />
						))}
					</div>
				)}

				<div className="flex items-center gap-1 mt-0.5 mx-1">
					<span className="text-[10px] text-muted-foreground">
						{format(new Date(message.createdAt), "HH:mm", { locale: fr })}
					</span>
					{message.isEdited && (
						<span className="text-[10px] text-muted-foreground italic">(modifié)</span>
					)}
					{isOwn && <MessageStatus status={message.status} />}
				</div>
			</div>
		</div>
	)
}
