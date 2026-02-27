"use client"

import { AnimatePresence, motion } from "framer-motion"

interface TypingUser {
	userId: string
	nom: string | null
}

interface TypingIndicatorProps {
	typingUsers: TypingUser[]
}

function BouncingDots() {
	return (
		<span className="inline-flex items-center gap-0.5 ml-1">
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					className="h-1 w-1 rounded-full bg-muted-foreground"
					animate={{ y: [0, -3, 0] }}
					transition={{
						duration: 0.6,
						repeat: Number.POSITIVE_INFINITY,
						delay: i * 0.15,
					}}
				/>
			))}
		</span>
	)
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
	if (typingUsers.length === 0) return null

	const names = typingUsers.map((u) => u.nom ?? "Quelqu'un")
	let text: string
	if (names.length === 1) {
		text = `${names[0]} est en train d'ecrire`
	} else if (names.length === 2) {
		text = `${names[0]} et ${names[1]} ecrivent`
	} else {
		text = `${names[0]} et ${names.length - 1} autres ecrivent`
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 4 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 4 }}
				className="flex items-center gap-1 px-4 py-1 text-xs text-muted-foreground"
			>
				<span>{text}</span>
				<BouncingDots />
			</motion.div>
		</AnimatePresence>
	)
}
