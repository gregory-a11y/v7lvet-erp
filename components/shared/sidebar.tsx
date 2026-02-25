"use client"

import {
	Building2,
	CalendarClock,
	CheckSquare,
	ChevronsLeft,
	ChevronsRight,
	FileText,
	LayoutDashboard,
	Menu,
	Settings,
	Ticket,
	Users,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { UserMenu } from "./user-menu"

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/clients", label: "Clients", icon: Building2 },
	{ href: "/runs", label: "Runs", icon: CalendarClock },
	{ href: "/taches", label: "Tâches", icon: CheckSquare },
	{ href: "/tickets", label: "Tickets", icon: Ticket },
	{ href: "/documents", label: "Documents", icon: FileText },
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
				"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
				isActive
					? "bg-sidebar-accent text-sidebar-accent-foreground"
					: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
				collapsed && "justify-center px-2",
			)}
			title={collapsed ? item.label : undefined}
		>
			<Icon className="h-5 w-5 shrink-0" />
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
			<div
				className={cn(
					"flex items-center border-b border-sidebar-border px-4 py-4",
					collapsed && "justify-center px-2",
				)}
			>
				{collapsed ? (
					<span className="text-lg font-bold text-primary-foreground">V7</span>
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

			{/* Navigation */}
			<nav className="flex-1 space-y-1 px-2 py-4">
				{navItems.map((item) => (
					<NavLink key={item.href} item={item} collapsed={collapsed} onClick={onLinkClick} />
				))}
			</nav>

			{/* Bottom: collapse toggle + user menu */}
			<div className="border-t border-sidebar-border px-2 py-3 space-y-2">
				{onToggle && (
					<button
						type="button"
						onClick={onToggle}
						className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
					>
						{collapsed ? (
							<ChevronsRight className="h-4 w-4" />
						) : (
							<ChevronsLeft className="h-4 w-4" />
						)}
					</button>
				)}
				<UserMenu />
			</div>
		</div>
	)
}

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false)

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
			<div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 border-b bg-sidebar px-3 py-2">
				<Sheet>
					<SheetTrigger asChild>
						<Button variant="ghost" size="icon" className="text-sidebar-foreground">
							<Menu className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
						<SidebarContent collapsed={false} onLinkClick={() => {}} />
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
