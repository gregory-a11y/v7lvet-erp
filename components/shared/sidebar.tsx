"use client"

import {
	BookOpen,
	Building2,
	CalendarClock,
	CheckSquare,
	ChevronsLeft,
	ChevronsRight,
	FileText,
	LayoutDashboard,
	Menu,
	Settings,
	Target,
	Ticket,
	Users,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./notification-bell"
import { UserMenu } from "./user-menu"

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/clients", label: "Clients", icon: Building2 },
	{ href: "/runs", label: "Runs", icon: CalendarClock },
	{ href: "/taches", label: "Tâches", icon: CheckSquare },
	{ href: "/tickets", label: "Tickets", icon: Ticket },
	{ href: "/documents", label: "Documents", icon: FileText },
	{ href: "/opportunites", label: "Opportunités", icon: Target },
	{ href: "/sops", label: "SOPs", icon: BookOpen },
	{ href: "/equipe", label: "Équipe", icon: Users },
	{ href: "/settings", label: "Settings", icon: Settings },
]

function NavLink({
	item,
	collapsed,
	onClick,
}: {
	item: (typeof navItems)[0]
	collapsed: boolean
	onClick?: () => void
}) {
	const pathname = usePathname()
	const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
	const Icon = item.icon

	return (
		<Link
			href={item.href}
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium tracking-wider uppercase transition-all duration-150",
				isActive
					? "border-l-2 border-[#6242FB] bg-[#6242FB]/10 text-white pl-[10px]"
					: "text-sidebar-foreground/60 hover:bg-[#6242FB]/5 hover:text-white border-l-2 border-transparent",
				collapsed && "justify-center px-2 border-l-0",
			)}
			title={collapsed ? item.label : undefined}
		>
			<Icon className="h-4 w-4 shrink-0" />
			{!collapsed && <span>{item.label}</span>}
		</Link>
	)
}

function SidebarContent({
	collapsed,
	onToggle,
	onLinkClick,
}: {
	collapsed: boolean
	onToggle?: () => void
	onLinkClick?: () => void
}) {
	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			{/* Logo */}
			<div className={cn("flex items-center px-5 py-5", collapsed && "justify-center px-2")}>
				{collapsed ? (
					<span className="text-base font-bold tracking-widest uppercase text-white/90 font-cabin">
						V7
					</span>
				) : (
					<Image
						src="/logos/v7lvet-emeraude.svg"
						alt="V7LVET"
						width={120}
						height={36}
						className="brightness-0 invert"
					/>
				)}
			</div>

			{/* Separator */}
			<div className="mx-4 h-px bg-sidebar-border/60" />

			{/* Navigation */}
			<nav className="flex-1 space-y-0.5 px-3 py-4">
				{navItems.map((item) => (
					<NavLink key={item.href} item={item} collapsed={collapsed} onClick={onLinkClick} />
				))}
			</nav>

			{/* Bottom: collapse toggle + notifications + user menu */}
			<div className="border-t border-sidebar-border/60 px-3 py-3 space-y-1">
				{onToggle && (
					<button
						type="button"
						onClick={onToggle}
						className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/40 hover:bg-[#6242FB]/5 hover:text-sidebar-foreground/80 transition-all duration-150"
					>
						{collapsed ? (
							<ChevronsRight className="h-4 w-4" />
						) : (
							<ChevronsLeft className="h-4 w-4" />
						)}
					</button>
				)}
				<div
					className={cn(
						"flex items-center gap-2 py-1",
						collapsed ? "justify-center flex-col" : "px-1",
					)}
				>
					<NotificationBell />
					{!collapsed && (
						<div className="flex-1">
							<UserMenu />
						</div>
					)}
				</div>
				{collapsed && <UserMenu />}
			</div>
		</div>
	)
}

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)

	return (
		<>
			{/* Desktop sidebar */}
			<aside
				className={cn(
					"hidden md:flex h-screen shrink-0 transition-all duration-200",
					collapsed ? "w-16" : "w-60",
				)}
			>
				<SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
			</aside>

			{/* Mobile: hamburger + sheet */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 border-b border-sidebar-border/60 bg-sidebar px-3 py-2">
				<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-[#6242FB]/5 transition-all duration-150"
						>
							<Menu className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
						<SheetTitle className="sr-only">Navigation</SheetTitle>
						<SidebarContent collapsed={false} onLinkClick={() => setMobileOpen(false)} />
					</SheetContent>
				</Sheet>
				<Image
					src="/logos/v7lvet-emeraude.svg"
					alt="V7LVET"
					width={100}
					height={30}
					className="brightness-0 invert"
				/>
			</div>
		</>
	)
}
