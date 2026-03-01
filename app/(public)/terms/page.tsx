import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Conditions d'utilisation — V7LVET",
	description: "Conditions d'utilisation de V7LVET ERP",
}

export default function TermsPage() {
	return (
		<article className="prose prose-sm">
			<h1>Conditions d'utilisation</h1>
			<p className="text-muted-foreground">Dernière mise à jour : 1er mars 2026</p>

			<h2>1. Objet</h2>
			<p>
				Les présentes conditions régissent l'utilisation de l'application V7LVET ERP (ci-après
				"l'Application"), un outil interne de gestion destiné aux collaborateurs du cabinet V7LVET.
			</p>

			<h2>2. Accès à l'Application</h2>
			<p>
				L'accès à l'Application est strictement réservé aux collaborateurs autorisés. Les comptes
				sont créés exclusivement par un administrateur. Aucune inscription publique n'est possible.
			</p>
			<p>
				Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.
			</p>

			<h2>3. Services proposés</h2>
			<p>L'Application permet notamment :</p>
			<ul>
				<li>La gestion des clients et des projets du cabinet</li>
				<li>La communication interne entre collaborateurs</li>
				<li>La gestion et la synchronisation des calendriers professionnels</li>
				<li>Le suivi des workflows et des tâches</li>
			</ul>

			<h2>4. Intégrations tierces</h2>
			<p>
				L'Application propose des intégrations optionnelles avec des services tiers (Google
				Calendar, Microsoft Outlook). L'activation de ces intégrations nécessite le consentement
				explicite de l'utilisateur et peut être révoquée à tout moment.
			</p>
			<p>
				L'utilisation de ces services tiers est soumise à leurs propres conditions d'utilisation.
			</p>

			<h2>5. Obligations de l'utilisateur</h2>
			<ul>
				<li>Utiliser l'Application dans un cadre exclusivement professionnel</li>
				<li>Ne pas tenter de contourner les mesures de sécurité</li>
				<li>Signaler toute faille de sécurité ou utilisation anormale à l'administrateur</li>
				<li>Ne pas partager ses identifiants de connexion</li>
			</ul>

			<h2>6. Propriété intellectuelle</h2>
			<p>
				L'Application, son code source, son design et ses contenus sont la propriété exclusive de
				V7LVET. Toute reproduction ou utilisation non autorisée est interdite.
			</p>

			<h2>7. Limitation de responsabilité</h2>
			<p>
				V7LVET s'efforce d'assurer la disponibilité et le bon fonctionnement de l'Application, mais
				ne saurait être tenu responsable des interruptions de service, pertes de données ou
				dysfonctionnements liés aux services tiers intégrés.
			</p>

			<h2>8. Données personnelles</h2>
			<p>
				Le traitement des données personnelles est détaillé dans notre{" "}
				<a href="/privacy">Politique de confidentialité</a>.
			</p>

			<h2>9. Modifications</h2>
			<p>
				Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés de
				toute modification substantielle.
			</p>

			<h2>10. Droit applicable</h2>
			<p>
				Les présentes conditions sont régies par le droit français. Tout litige sera soumis aux
				tribunaux compétents.
			</p>
		</article>
	)
}
