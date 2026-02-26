"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { pageTransition } from "@/lib/animations"

export function PageTransition({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	return (
		<motion.div
			key={pathname}
			variants={pageTransition}
			initial="initial"
			animate="animate"
			className="min-h-full"
		>
			{children}
		</motion.div>
	)
}
