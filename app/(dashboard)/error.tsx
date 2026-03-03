"use client"

export default function DashboardError({
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
			<h2 className="text-lg font-semibold">Une erreur est survenue</h2>
			<p className="text-muted-foreground text-sm">Veuillez rafraîchir la page ou réessayer.</p>
			<button
				type="button"
				onClick={reset}
				className="px-4 py-2 bg-v7-primary text-white rounded-md text-sm hover:bg-v7-primary/90 transition-colors"
			>
				Réessayer
			</button>
		</div>
	)
}
