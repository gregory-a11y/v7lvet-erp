import { Sidebar } from "@/components/shared/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar />
			<main className="flex-1 overflow-auto bg-background pt-0 md:pt-0">
				{/* Mobile: add top padding for fixed header */}
				<div className="md:hidden h-14" />
				{children}
			</main>
		</div>
	)
}
