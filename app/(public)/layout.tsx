export default function PublicLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b bg-white">
				<div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-v7-emeraude flex items-center justify-center">
							<span className="text-white font-heading text-xs font-bold">V7</span>
						</div>
						<span className="font-heading text-sm text-v7-ocean">V7LVET</span>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
			<footer className="border-t mt-20">
				<div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">
					&copy; {new Date().getFullYear()} V7LVET. Tous droits réservés.
				</div>
			</footer>
		</div>
	)
}
