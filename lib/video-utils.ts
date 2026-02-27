export type VideoInfo = {
	provider: "youtube" | "vimeo" | "loom" | "tella"
	videoId: string
	embedUrl: string
	thumbnailUrl: string
}

export function parseVideoUrl(url: string): VideoInfo | null {
	if (!url) return null
	const trimmed = url.trim()

	// YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
	const ytMatch =
		trimmed.match(
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		) ?? null
	if (ytMatch) {
		return {
			provider: "youtube",
			videoId: ytMatch[1],
			embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
			thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
		}
	}

	// Vimeo: vimeo.com/ID
	const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/) ?? null
	if (vimeoMatch) {
		return {
			provider: "vimeo",
			videoId: vimeoMatch[1],
			embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
			thumbnailUrl: `https://vumbnail.com/${vimeoMatch[1]}.jpg`,
		}
	}

	// Loom: loom.com/share/ID
	const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/) ?? null
	if (loomMatch) {
		return {
			provider: "loom",
			videoId: loomMatch[1],
			embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
			thumbnailUrl: `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}-with-play.gif`,
		}
	}

	// Tella: tella.tv/video/ID, tella.tv/video/ID/embed
	const tellaMatch = trimmed.match(/tella\.tv\/video\/([a-zA-Z0-9_-]+)/) ?? null
	if (tellaMatch) {
		return {
			provider: "tella",
			videoId: tellaMatch[1],
			embedUrl: `https://www.tella.tv/video/${tellaMatch[1]}/embed`,
			thumbnailUrl: `https://www.tella.tv/api/og?videoId=${tellaMatch[1]}`,
		}
	}

	return null
}
