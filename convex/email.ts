/**
 * Email utilities for V7LVET ERP (Resend API via fetch)
 */

import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
}

export async function sendWelcomeEmail(args: {
	email: string
	name: string
	password: string
	siteUrl: string
	subject?: string
}) {
	const resendApiKey = process.env.RESEND_API_KEY
	if (!resendApiKey) {
		console.warn("[email] RESEND_API_KEY not set — email skipped")
		return false
	}

	const safeName = escapeHtml(args.name)
	const safeEmail = escapeHtml(args.email)
	const safePassword = escapeHtml(args.password)

	try {
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${resendApiKey}`,
			},
			body: JSON.stringify({
				from: "V7LVET ERP <noreply@send.v7lvet.com>",
				to: args.email,
				subject: args.subject ?? "Bienvenue sur V7LVET ERP — Vos identifiants",
				html: `
					<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
						<div style="text-align: center; margin-bottom: 32px;">
							<h1 style="font-family: Cabin, sans-serif; color: #063238; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">V7LVET</h1>
						</div>
						<div style="background: #F4F5F3; border-radius: 12px; padding: 32px;">
							<h2 style="color: #063238; margin-top: 0;">Bienvenue, ${safeName}</h2>
							<p style="color: #444;">Voici vos identifiants de connexion :</p>
							<div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
								<p style="margin: 8px 0;"><strong>Email :</strong> ${safeEmail}</p>
								<p style="margin: 8px 0;"><strong>Mot de passe :</strong> ${safePassword}</p>
							</div>
							<p style="color: #444;">Vous devrez changer votre mot de passe lors de votre première connexion.</p>
							<div style="text-align: center; margin-top: 24px;">
								<a href="${args.siteUrl}" style="background: #2E6965; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Se connecter</a>
							</div>
						</div>
						<p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">V7LVET — Cabinet d'expertise comptable</p>
					</div>
				`,
			}),
		})

		if (!emailResponse.ok) {
			const errorBody = await emailResponse.text()
			console.error(`[email] Resend error ${emailResponse.status}: ${errorBody}`)
			return false
		}

		const result = await emailResponse.json()
		console.log(`[email] Sent to ${args.email}, id: ${result.id}`)
		return true
	} catch (err) {
		console.error("[email] Exception:", err)
		return false
	}
}

export async function sendPasswordResetEmail(args: {
	email: string
	name: string
	resetUrl: string
}) {
	const resendApiKey = process.env.RESEND_API_KEY
	if (!resendApiKey) {
		console.warn("[email] RESEND_API_KEY not set — email skipped")
		return false
	}
	const safeName = escapeHtml(args.name || "Utilisateur")

	try {
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${resendApiKey}`,
			},
			body: JSON.stringify({
				from: "V7LVET ERP <noreply@send.v7lvet.com>",
				to: args.email,
				subject: "V7LVET ERP — Réinitialisation de votre mot de passe",
				html: `
					<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
						<div style="text-align: center; margin-bottom: 32px;">
							<h1 style="font-family: Cabin, sans-serif; color: #063238; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">V7LVET</h1>
						</div>
						<div style="background: #F4F5F3; border-radius: 12px; padding: 32px;">
							<h2 style="color: #063238; margin-top: 0;">Réinitialisation du mot de passe</h2>
							<p style="color: #444;">Bonjour ${safeName},</p>
							<p style="color: #444;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
							<div style="text-align: center; margin: 28px 0;">
								<a href="${args.resetUrl}" style="background: #2E6965; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Réinitialiser mon mot de passe</a>
							</div>
							<p style="color: #888; font-size: 13px;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
						</div>
						<p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">V7LVET — Cabinet d'expertise comptable</p>
					</div>
				`,
			}),
		})

		if (!emailResponse.ok) {
			const errorBody = await emailResponse.text()
			console.error(`[email] Resend error ${emailResponse.status}: ${errorBody}`)
			return false
		}

		const result = await emailResponse.json()
		console.log(`[email] Password reset sent to ${args.email}, id: ${result.id}`)
		return true
	} catch (err) {
		console.error("[email] Exception:", err)
		return false
	}
}

export async function sendDocumentRequestEmail(args: {
	email: string
	name: string
	clientName: string
	documentTitle: string
	dueDate?: number
}) {
	const resendApiKey = process.env.RESEND_API_KEY
	if (!resendApiKey) {
		console.warn("[email] RESEND_API_KEY not set — email skipped")
		return false
	}

	const safeName = escapeHtml(args.name)
	const safeClientName = escapeHtml(args.clientName)
	const safeTitle = escapeHtml(args.documentTitle)
	const dueDateStr = args.dueDate
		? format(new Date(args.dueDate), "d MMMM yyyy", { locale: fr })
		: null

	try {
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${resendApiKey}`,
			},
			body: JSON.stringify({
				from: "V7LVET ERP <noreply@send.v7lvet.com>",
				to: args.email,
				subject: `V7LVET — Demande de document : ${args.documentTitle}`,
				html: `
					<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
						<div style="text-align: center; margin-bottom: 32px;">
							<h1 style="font-family: Cabin, sans-serif; color: #063238; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">V7LVET</h1>
						</div>
						<div style="background: #F4F5F3; border-radius: 12px; padding: 32px;">
							<h2 style="color: #063238; margin-top: 0;">Demande de document</h2>
							<p style="color: #444;">Bonjour ${safeName},</p>
							<p style="color: #444;">Une demande de document a été créée pour <strong>${safeClientName}</strong> :</p>
							<div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
								<p style="margin: 8px 0;"><strong>Document :</strong> ${safeTitle}</p>
								${dueDateStr ? `<p style="margin: 8px 0;"><strong>Date limite :</strong> ${dueDateStr}</p>` : ""}
							</div>
						</div>
						<p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">V7LVET — Cabinet d'expertise comptable</p>
					</div>
				`,
			}),
		})

		if (!emailResponse.ok) {
			const errorBody = await emailResponse.text()
			console.error(`[email] Resend error ${emailResponse.status}: ${errorBody}`)
			return false
		}

		const result = await emailResponse.json()
		console.log(`[email] Document request email sent to ${args.email}, id: ${result.id}`)
		return true
	} catch (err) {
		console.error("[email] Exception:", err)
		return false
	}
}

export async function sendVideoLinkEmail(args: {
	email: string
	name: string
	date: string
	videoUrl: string
	rdvType?: string
}) {
	const resendApiKey = process.env.RESEND_API_KEY
	if (!resendApiKey) {
		console.warn("[email] RESEND_API_KEY not set — email skipped")
		return false
	}

	const safeName = escapeHtml(args.name)
	const safeDate = escapeHtml(args.date)
	const typeLabel = args.rdvType === "visio" ? "visioconférence" : "rendez-vous"

	try {
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${resendApiKey}`,
			},
			body: JSON.stringify({
				from: "V7LVET ERP <noreply@send.v7lvet.com>",
				to: args.email,
				subject: `V7LVET — Votre lien de ${typeLabel}`,
				html: `
					<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
						<div style="text-align: center; margin-bottom: 32px;">
							<h1 style="font-family: Cabin, sans-serif; color: #063238; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">V7LVET</h1>
						</div>
						<div style="background: #F4F5F3; border-radius: 12px; padding: 32px;">
							<h2 style="color: #063238; margin-top: 0;">Confirmation de ${typeLabel}</h2>
							<p style="color: #444;">Bonjour ${safeName},</p>
							<p style="color: #444;">Votre ${typeLabel} est confirmé pour le <strong>${safeDate}</strong>.</p>
							<div style="text-align: center; margin: 28px 0;">
								<a href="${args.videoUrl}" style="background: #2E6965; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Rejoindre la ${typeLabel}</a>
							</div>
							<p style="color: #888; font-size: 13px;">Ce lien sera actif le jour du rendez-vous.</p>
						</div>
						<p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">V7LVET — Cabinet d'expertise comptable</p>
					</div>
				`,
			}),
		})

		if (!emailResponse.ok) {
			const errorBody = await emailResponse.text()
			console.error(`[email] Resend error ${emailResponse.status}: ${errorBody}`)
			return false
		}

		const result = await emailResponse.json()
		console.log(`[email] Video link email sent to ${args.email}, id: ${result.id}`)
		return true
	} catch (err) {
		console.error("[email] Exception:", err)
		return false
	}
}

export async function sendDocumentUploadedEmail(args: {
	email: string
	name: string
	clientName: string
	documentTitle: string
}) {
	const resendApiKey = process.env.RESEND_API_KEY
	if (!resendApiKey) {
		console.warn("[email] RESEND_API_KEY not set — email skipped")
		return false
	}

	const safeName = escapeHtml(args.name)
	const safeClientName = escapeHtml(args.clientName)
	const safeTitle = escapeHtml(args.documentTitle)

	try {
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${resendApiKey}`,
			},
			body: JSON.stringify({
				from: "V7LVET ERP <noreply@send.v7lvet.com>",
				to: args.email,
				subject: `V7LVET — Document uploadé : ${args.documentTitle}`,
				html: `
					<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
						<div style="text-align: center; margin-bottom: 32px;">
							<h1 style="font-family: Cabin, sans-serif; color: #063238; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">V7LVET</h1>
						</div>
						<div style="background: #F4F5F3; border-radius: 12px; padding: 32px;">
							<h2 style="color: #063238; margin-top: 0;">Document uploadé</h2>
							<p style="color: #444;">Bonjour ${safeName},</p>
							<p style="color: #444;">Le document <strong>"${safeTitle}"</strong> demandé pour <strong>${safeClientName}</strong> a été uploadé.</p>
							<p style="color: #444;">Connectez-vous à V7LVET pour le consulter et le valider.</p>
						</div>
						<p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">V7LVET — Cabinet d'expertise comptable</p>
					</div>
				`,
			}),
		})

		if (!emailResponse.ok) {
			const errorBody = await emailResponse.text()
			console.error(`[email] Resend error ${emailResponse.status}: ${errorBody}`)
			return false
		}

		const result = await emailResponse.json()
		console.log(`[email] Document uploaded email sent to ${args.email}, id: ${result.id}`)
		return true
	} catch (err) {
		console.error("[email] Exception:", err)
		return false
	}
}
