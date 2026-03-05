/**
 * AES-256-GCM encryption for sensitive data (OAuth tokens).
 * Uses OAUTH_ENCRYPTION_KEY env var (base64-encoded 32-byte key).
 */

const ALGORITHM = "AES-GCM"
const IV_LENGTH = 12
const TAG_LENGTH = 128

function getEncryptionKey(): string {
	const key = process.env.OAUTH_ENCRYPTION_KEY
	if (!key) {
		throw new Error("OAUTH_ENCRYPTION_KEY non configuré dans les variables d'environnement Convex")
	}
	return key
}

async function importKey(rawKeyB64: string): Promise<CryptoKey> {
	const raw = Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0))
	return crypto.subtle.importKey("raw", raw, { name: ALGORITHM }, false, ["encrypt", "decrypt"])
}

/**
 * Encrypts a plaintext string. Returns base64(iv + ciphertext).
 */
export async function encrypt(plaintext: string): Promise<string> {
	const key = await importKey(getEncryptionKey())
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
	const encoded = new TextEncoder().encode(plaintext)

	const ciphertext = await crypto.subtle.encrypt(
		{ name: ALGORITHM, iv, tagLength: TAG_LENGTH },
		key,
		encoded,
	)

	// Combine IV + ciphertext into a single buffer
	const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
	combined.set(iv, 0)
	combined.set(new Uint8Array(ciphertext), IV_LENGTH)

	return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts a base64(iv + ciphertext) string back to plaintext.
 */
export async function decrypt(encryptedB64: string): Promise<string> {
	const key = await importKey(getEncryptionKey())
	const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

	const iv = combined.slice(0, IV_LENGTH)
	const ciphertext = combined.slice(IV_LENGTH)

	const decrypted = await crypto.subtle.decrypt(
		{ name: ALGORITHM, iv, tagLength: TAG_LENGTH },
		key,
		ciphertext,
	)

	return new TextDecoder().decode(decrypted)
}

/**
 * Checks if a value looks like an encrypted token (base64 with min length).
 * Unencrypted tokens (legacy) are typically shorter or contain dots/dashes.
 */
export function isEncrypted(value: string): boolean {
	// Encrypted tokens are base64 and at least IV_LENGTH + some ciphertext
	// They won't contain dots, dashes, or underscores typical of OAuth tokens
	if (value.length < 24) return false
	try {
		const decoded = atob(value)
		// Encrypted data starts with 12-byte IV, so minimum ~16 chars decoded
		return decoded.length >= IV_LENGTH + 16
	} catch {
		return false
	}
}

/**
 * Safely decrypts a token, falling back to plaintext for legacy unencrypted values.
 */
export async function decryptToken(value: string): Promise<string> {
	try {
		return await decrypt(value)
	} catch {
		// Legacy unencrypted token — return as-is
		return value
	}
}
