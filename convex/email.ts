/**
 * Email utilities for V7LVET ERP (Resend API via fetch)
 */

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
