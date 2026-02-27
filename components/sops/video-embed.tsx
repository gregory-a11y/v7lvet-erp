"use client"

import { parseVideoUrl } from "@/lib/video-utils"

interface VideoEmbedProps {
	url: string
}

export function VideoEmbed({ url }: VideoEmbedProps) {
	const info = parseVideoUrl(url)
	if (!info) return null

	return (
		<div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
			<iframe
				src={info.embedUrl}
				className="h-full w-full"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				title={`Vidéo ${info.provider}`}
			/>
		</div>
	)
}
