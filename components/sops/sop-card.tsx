"use client"

import { motion } from "framer-motion"
import { BookOpen, FileText, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel"
import { parseVideoUrl } from "@/lib/video-utils"

interface SopCardProps {
	id: Id<"sops">
	nom: string
	description?: string | null
	categoryNom?: string | null
	categoryColor?: string | null
	videoUrl?: string | null
	attachments?: { storageId: string; nom: string; mimeType: string; fileSize: number }[]
	isActive: boolean
	createdAt: number
	index?: number
}

export function SopCard({
	id,
	nom,
	description,
	categoryNom,
	categoryColor,
	videoUrl,
	attachments,
	isActive,
	createdAt,
	index = 0,
}: SopCardProps) {
	const router = useRouter()
	const videoInfo = videoUrl ? parseVideoUrl(videoUrl) : null
	const [imgError, setImgError] = useState(false)

	function getThumbnail() {
		if (videoInfo) {
			// YouTube has reliable public thumbnails
			if (videoInfo.provider === "youtube" && !imgError) {
				return (
					<div className="relative h-full w-full">
						<img
							src={videoInfo.thumbnailUrl}
							alt=""
							className="h-full w-full object-cover"
							onError={() => setImgError(true)}
						/>
						<div className="absolute inset-0 flex items-center justify-center bg-black/20">
							<div className="rounded-full bg-white/90 p-2">
								<Play className="h-5 w-5 text-foreground fill-current" />
							</div>
						</div>
					</div>
				)
			}
			// Loom, Tella, Vimeo : mini embed iframe as preview
			return (
				<div className="relative h-full w-full">
					<iframe
						src={videoInfo.embedUrl}
						className="h-full w-full pointer-events-none"
						loading="lazy"
						title="Aperçu vidéo"
					/>
				</div>
			)
		}
		if (attachments && attachments.length > 0) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-muted">
					<FileText className="h-10 w-10 text-destructive/50" />
				</div>
			)
		}
		return (
			<div className="flex h-full w-full items-center justify-center bg-muted">
				<BookOpen className="h-10 w-10 text-muted-foreground/40" />
			</div>
		)
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05, duration: 0.3 }}
		>
			<Card
				className="cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-primary/50 group"
				onClick={() => router.push(`/sops/${id}`)}
			>
				<div className="aspect-video overflow-hidden">{getThumbnail()}</div>
				<CardContent className="p-4 space-y-2">
					{categoryNom && (
						<Badge
							variant="outline"
							className="text-xs"
							style={
								categoryColor ? { borderColor: categoryColor, color: categoryColor } : undefined
							}
						>
							{categoryNom}
						</Badge>
					)}
					<h3 className="font-heading text-sm uppercase leading-tight line-clamp-2 group-hover:text-primary transition-colors">
						{nom}
					</h3>
					{description && (
						<p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
					)}
				</CardContent>
				<CardFooter className="px-4 pb-3 pt-0 flex items-center gap-2">
					<Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
						{isActive ? "Active" : "Inactive"}
					</Badge>
					<span className="text-[10px] text-muted-foreground ml-auto">
						{new Date(createdAt).toLocaleDateString("fr-FR")}
					</span>
				</CardFooter>
			</Card>
		</motion.div>
	)
}
