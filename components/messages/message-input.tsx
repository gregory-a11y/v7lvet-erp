"use client"

import { useMutation } from "convex/react"
import { Paperclip, Send } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"

interface MessageInputProps {
	onSend: (
		content: string,
		attachments?: { storageId: string; nom: string; mimeType: string; fileSize: number }[],
	) => void
	onKeystroke: () => void
}

export function MessageInput({ onSend, onKeystroke }: MessageInputProps) {
	const [content, setContent] = useState("")
	const [uploading, setUploading] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const generateUploadUrl = useMutation(api.messages.generateUploadUrl)

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = "auto"
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`
	}, [])

	const handleSend = useCallback(() => {
		const trimmed = content.trim()
		if (!trimmed) return
		onSend(trimmed)
		setContent("")
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"
		}
	}, [content, onSend])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setContent(e.target.value)
			onKeystroke()
			adjustHeight()
		},
		[onKeystroke, adjustHeight],
	)

	const handleFileUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (!file) return

			setUploading(true)
			try {
				const uploadUrl = await generateUploadUrl()
				const response = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				})
				const { storageId } = (await response.json()) as { storageId: string }
				onSend("", [
					{
						storageId,
						nom: file.name,
						mimeType: file.type,
						fileSize: file.size,
					},
				])
			} catch {
				// silently fail
			} finally {
				setUploading(false)
				if (fileInputRef.current) {
					fileInputRef.current.value = ""
				}
			}
		},
		[generateUploadUrl, onSend],
	)

	return (
		<div className="border-t bg-white px-4 py-3">
			<div className="flex items-end gap-2">
				<input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading}
				>
					<Paperclip className="h-4 w-4" />
				</Button>

				<textarea
					ref={textareaRef}
					value={content}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder="Écrire un message..."
					rows={1}
					className="flex-1 resize-none bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-v7-emeraude/50 transition-colors placeholder:text-muted-foreground"
				/>

				<Button
					size="icon"
					className="h-8 w-8 shrink-0 bg-v7-emeraude hover:bg-v7-emeraude/90"
					onClick={handleSend}
					disabled={!content.trim() || uploading}
				>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
