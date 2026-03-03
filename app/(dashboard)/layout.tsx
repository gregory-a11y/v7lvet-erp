import { AuthGate } from "@/components/shared/auth-gate"
import { PageTransition } from "@/components/shared/page-transition"
import { PasswordChangeGuard } from "@/components/shared/password-change-guard"
import { PresenceProvider } from "@/components/shared/presence-provider"
import { SectionGuard } from "@/components/shared/section-guard"
import { Sidebar } from "@/components/shared/sidebar"
import { CurrentUserProvider } from "@/lib/contexts/current-user"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthGate>
			<CurrentUserProvider>
				<PresenceProvider>
					<PasswordChangeGuard>
						<div className="flex h-screen overflow-hidden">
							<a
								href="#main-content"
								className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
							>
								Aller au contenu principal
							</a>
							<Sidebar />
							<main id="main-content" className="flex-1 overflow-auto bg-background">
								{/* Mobile: spacer for fixed header */}
								<div className="md:hidden h-14" />
								<SectionGuard>
									<PageTransition>{children}</PageTransition>
								</SectionGuard>
							</main>
						</div>
					</PasswordChangeGuard>
				</PresenceProvider>
			</CurrentUserProvider>
		</AuthGate>
	)
}
