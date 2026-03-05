"use client"

import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { Send, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useCreateTodoComment, useRemoveTodoComment, useTodoComments } from "@/lib/hooks/use-todos"

export function TodoComments({ todoId }: { todoId: Id<"todos"> }) {
	const comments = useTodoComments(todoId)
	const createComment = useCreateTodoComment()
	const removeComment = useRemoveTodoComment()
	const { getMemberName } = useTeamMembers()
	const { user } = useCurrentUser()
	const currentUserId = user?.id as string | undefined
	const [content, setContent] = useState("")
	const [submitting, setSubmitting] = useState(false)

	async function handleSubmit() {
		if (!content.trim()) return
		setSubmitting(true)
		try {
			await createComment({ todoId, contenu: content.trim() })
			setContent("")
		} catch {
			toast.error("Erreur")
		} finally {
			setSubmitting(false)
		}
	}

	async function handleDelete(id: Id<"todoComments">) {
		try {
			await removeComment(id)
		} catch {
			toast.error("Erreur")
		}
	}

	return (
		<div className="space-y-4">
			{/* Comments list */}
			{comments === undefined ? (
				<div className="text-sm text-muted-foreground">Chargement...</div>
			) : comments.length === 0 ? (
				<div className="text-sm text-muted-foreground">Aucun commentaire</div>
			) : (
				<div className="space-y-3">
					{comments.map((comment) => (
						<div key={comment._id} className="group">
							<div className="flex items-start justify-between">
								<div>
									<span className="text-sm font-medium">{getMemberName(comment.authorId)}</span>
									<span className="text-xs text-muted-foreground ml-2">
										{formatDistanceToNow(new Date(comment.createdAt), {
											addSuffix: true,
											locale: fr,
										})}
									</span>
								</div>
								{comment.authorId === currentUserId && (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
										onClick={() => handleDelete(comment._id)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								)}
							</div>
							<p className="text-sm mt-1 whitespace-pre-wrap">{comment.contenu}</p>
						</div>
					))}
				</div>
			)}

			{/* Add comment */}
			<div className="flex gap-2">
				<Textarea
					placeholder="Ajouter un commentaire..."
					value={content}
					onChange={(e) => setContent(e.target.value)}
					className="min-h-[60px] text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
					}}
				/>
				<Button
					variant="outline"
					size="icon"
					className="shrink-0 self-end"
					onClick={handleSubmit}
					disabled={submitting || !content.trim()}
				>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
