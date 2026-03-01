import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Politique de confidentialité — V7LVET",
	description: "Politique de confidentialité de V7LVET ERP",
}

export default function PrivacyPage() {
	return (
		<article className="prose prose-sm">
			<h1>Politique de confidentialité</h1>
			<p className="text-muted-foreground">Dernière mise à jour : 1er mars 2026</p>

			<h2>1. Responsable du traitement</h2>
			<p>
				V7LVET, cabinet de conseil en gestion de patrimoine, est responsable du traitement des
				données personnelles collectées via l'application V7LVET ERP (ci-après "l'Application").
			</p>

			<h2>2. Données collectées</h2>
			<p>
				Dans le cadre de l'utilisation de l'Application, nous collectons les données suivantes :
			</p>
			<ul>
				<li>
					<strong>Données d'identification</strong> : nom, prénom, adresse email professionnelle
				</li>
				<li>
					<strong>Données de connexion</strong> : identifiants de session, horodatage des connexions
				</li>
				<li>
					<strong>Données de calendrier</strong> : événements, titres, dates, participants et liens
					de visioconférence, synchronisés depuis Google Calendar ou Microsoft Outlook avec votre
					consentement explicite
				</li>
				<li>
					<strong>Données de messagerie interne</strong> : messages échangés entre collaborateurs au
					sein de l'Application
				</li>
			</ul>

			<h2>3. Finalités du traitement</h2>
			<p>Les données sont traitées pour les finalités suivantes :</p>
			<ul>
				<li>Gestion des accès et authentification des utilisateurs</li>
				<li>
					Synchronisation bidirectionnelle des calendriers (Google Calendar, Microsoft Outlook)
				</li>
				<li>Communication interne entre les membres de l'équipe</li>
				<li>Gestion des clients, projets et workflows du cabinet</li>
			</ul>

			<h2>4. Base légale</h2>
			<p>
				Le traitement des données est fondé sur l'intérêt légitime de l'entreprise (gestion interne)
				et le consentement explicite de l'utilisateur pour la connexion à des services tiers (Google
				Calendar, Microsoft Outlook).
			</p>

			<h2>5. Services tiers et API</h2>
			<h3>Google Calendar</h3>
			<p>
				L'Application utilise l'API Google Calendar pour synchroniser vos événements. Lorsque vous
				connectez votre compte Google :
			</p>
			<ul>
				<li>
					Nous accédons uniquement à vos <strong>événements de calendrier</strong> et à votre{" "}
					<strong>adresse email</strong>
				</li>
				<li>Les tokens d'accès sont stockés de manière chiffrée sur nos serveurs</li>
				<li>
					Vous pouvez révoquer cet accès à tout moment depuis l'Application ou depuis votre compte
					Google (
					<a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>)
				</li>
				<li>
					L'utilisation des données Google est conforme aux{" "}
					<a href="https://developers.google.com/terms/api-services-user-data-policy">
						Google API Services User Data Policy
					</a>
					, y compris les exigences de Limited Use
				</li>
			</ul>

			<h3>Microsoft Outlook</h3>
			<p>
				L'Application utilise l'API Microsoft Graph pour synchroniser vos événements Outlook. Les
				mêmes principes de minimisation des données et de consentement s'appliquent.
			</p>

			<h2>6. Durée de conservation</h2>
			<p>
				Les données sont conservées pendant la durée de la relation de travail. Les tokens d'accès
				aux services tiers sont supprimés immédiatement lors de la déconnexion du service concerné.
				Les données de calendrier synchronisées sont supprimées lors de la déconnexion du compte
				externe.
			</p>

			<h2>7. Sécurité</h2>
			<p>Nous mettons en place les mesures de sécurité suivantes :</p>
			<ul>
				<li>Chiffrement des communications (HTTPS/TLS)</li>
				<li>Authentification obligatoire pour tout accès à l'Application</li>
				<li>Stockage sécurisé des tokens d'accès (jamais exposés côté client)</li>
				<li>Contrôle d'accès basé sur les rôles (admin, manager, collaborateur)</li>
				<li>Aucune donnée sensible stockée en clair</li>
			</ul>

			<h2>8. Droits des utilisateurs</h2>
			<p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
			<ul>
				<li>Droit d'accès, de rectification et de suppression</li>
				<li>Droit à la portabilité des données</li>
				<li>Droit de retirer votre consentement à tout moment</li>
				<li>Droit d'opposition au traitement</li>
			</ul>
			<p>
				Pour exercer ces droits, contactez votre administrateur ou écrivez à{" "}
				<strong>contact@v7lvet.com</strong>.
			</p>

			<h2>9. Accès limité aux données</h2>
			<p>
				L'Application est un outil interne à accès restreint. Seuls les collaborateurs autorisés par
				un administrateur peuvent y accéder. Aucune inscription publique n'est possible.
			</p>

			<h2>10. Modifications</h2>
			<p>
				Cette politique peut être mise à jour. Les utilisateurs seront informés de toute
				modification substantielle. La date de dernière mise à jour est indiquée en haut de cette
				page.
			</p>
		</article>
	)
}
