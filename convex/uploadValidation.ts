// Upload security validation constants and helpers

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export const ALLOWED_DOC_MIMES = [
	...ALLOWED_IMAGE_MIMES,
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

export function validateFile(
	mimeType: string | undefined,
	fileSize: number | undefined,
	allowedMimes: string[],
	maxSize: number,
): void {
	if (mimeType && !allowedMimes.includes(mimeType)) {
		throw new Error(
			`Type de fichier non autorisé : ${mimeType}. Types acceptés : ${allowedMimes.join(", ")}`,
		)
	}
	if (fileSize !== undefined && fileSize > maxSize) {
		throw new Error(
			`Fichier trop volumineux : ${(fileSize / 1024 / 1024).toFixed(1)}MB. Maximum : ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
		)
	}
}

export function validateAttachments(
	attachments:
		| Array<{
				storageId: string
				nom: string
				mimeType: string
				fileSize: number
		  }>
		| undefined,
	allowedMimes: string[],
	maxSize: number,
): void {
	if (!attachments) return
	for (const att of attachments) {
		validateFile(att.mimeType, att.fileSize, allowedMimes, maxSize)
	}
}
