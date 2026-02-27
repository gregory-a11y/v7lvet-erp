"use client"

import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
	Bold,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	LinkIcon,
	List,
	ListOrdered,
	Minus,
	Pilcrow,
	Quote,
} from "lucide-react"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"

interface SopEditorProps {
	initialContent?: string
	onChange: (html: string) => void
	editable?: boolean
}

export function SopEditor({ initialContent = "", onChange, editable = true }: SopEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			Link.configure({ openOnClick: false }),
			Placeholder.configure({ placeholder: "Décrivez les étapes de la procédure…" }),
		],
		content: initialContent,
		editable,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML())
		},
		editorProps: {
			attributes: {
				class: "prose prose-sm max-w-none min-h-[200px] focus:outline-none p-4",
			},
		},
	})

	const setLink = useCallback(() => {
		if (!editor) return
		const previousUrl = editor.getAttributes("link").href
		const url = window.prompt("URL du lien", previousUrl)
		if (url === null) return
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run()
			return
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
	}, [editor])

	if (!editor) return null

	if (!editable) {
		return (
			<div className="prose prose-sm max-w-none">
				<EditorContent editor={editor} />
			</div>
		)
	}

	return (
		<div className="rounded-md border bg-background">
			<div className="flex flex-wrap gap-1 border-b p-2">
				<Button
					type="button"
					variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().setParagraph().run()}
					title="Paragraphe"
				>
					<Pilcrow className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					title="Titre 1"
				>
					<Heading1 className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					title="Titre 2"
				>
					<Heading2 className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					title="Titre 3"
				>
					<Heading3 className="h-4 w-4" />
				</Button>
				<div className="mx-1 w-px bg-border" />
				<Button
					type="button"
					variant={editor.isActive("bold") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleBold().run()}
					title="Gras"
				>
					<Bold className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("italic") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleItalic().run()}
					title="Italique"
				>
					<Italic className="h-4 w-4" />
				</Button>
				<div className="mx-1 w-px bg-border" />
				<Button
					type="button"
					variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					title="Liste à puces"
				>
					<List className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					title="Liste numérotée"
				>
					<ListOrdered className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
					title="Citation"
				>
					<Quote className="h-4 w-4" />
				</Button>
				<div className="mx-1 w-px bg-border" />
				<Button
					type="button"
					variant={editor.isActive("link") ? "secondary" : "ghost"}
					size="sm"
					className="h-8 w-8 p-0"
					onClick={setLink}
					title="Lien"
				>
					<LinkIcon className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => editor.chain().focus().setHorizontalRule().run()}
					title="Séparateur"
				>
					<Minus className="h-4 w-4" />
				</Button>
			</div>
			<EditorContent editor={editor} />
		</div>
	)
}
