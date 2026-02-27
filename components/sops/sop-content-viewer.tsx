"use client"

import Link from "@tiptap/extension-link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

interface SopContentViewerProps {
	html: string
}

export function SopContentViewer({ html }: SopContentViewerProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
			Link.configure({ openOnClick: true }),
		],
		content: html,
		editable: false,
		editorProps: {
			attributes: {
				class: "prose prose-sm max-w-none focus:outline-none",
			},
		},
	})

	if (!editor) return null

	return <EditorContent editor={editor} />
}
