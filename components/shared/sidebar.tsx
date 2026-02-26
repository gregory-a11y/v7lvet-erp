"use client"

import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
	BookOpen,
	Building2,
	CalendarClock,
	CheckSquare,
	ChevronsRight,
	FileText,
	LayoutDashboard,
	Menu,
	Settings,
	Target,
	Ticket,
	TrendingUp,
	Users,
	X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
	sidebarNavItem,
	springSmooth,
	springSnappy,
	staggerContainer,
	tooltipVariants,
} from "@/lib/animations"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import type { SectionKey } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./notification-bell"
import { UserMenu } from "./user-menu"

const SIDEBAR_EXPANDED = 264
const SIDEBAR_COLLAPSED = 76

interface NavItem {
	href: string
	label: string
	icon: LucideIcon
}

interface NavSection {
	key: SectionKey
	label: string
	items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
	{
		key: "operationnel",
		label: "Opérationnel",
		items: [
			{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
			{ href: "/clients", label: "Clients", icon: Building2 },
			{ href: "/runs", label: "Runs", icon: CalendarClock },
			{ href: "/taches", label: "Tâches", icon: CheckSquare },
			{ href: "/tickets", label: "Tickets", icon: Ticket },
			{ href: "/documents", label: "Documents", icon: FileText },
			{ href: "/sops", label: "SOPs", icon: BookOpen },
		],
	},
	{
		key: "acquisition",
		label: "Acquisition",
		items: [
			{ href: "/acquisition", label: "Dashboard Acquisition", icon: TrendingUp },
			{ href: "/opportunites", label: "Opportunités", icon: Target },
		],
	},
	{
		key: "administration",
		label: "Administration",
		items: [
			{ href: "/equipe", label: "Équipe", icon: Users },
			{ href: "/settings", label: "Settings", icon: Settings },
		],
	},
]

function NavTooltip({ label, show }: { label: string; show: boolean }) {
	return (
		<AnimatePresence>
			{show && (
				<motion.div
					variants={tooltipVariants}
					initial="hidden"
					animate="visible"
					exit="hidden"
					className="absolute left-full ml-3 z-50 rounded-md bg-v7-ocean px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap pointer-events-none"
				>
					{label}
					<div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-v7-ocean" />
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function NavLink({
	item,
	collapsed,
	onClick,
}: {
	item: NavItem
	collapsed: boolean
	onClick?: () => void
}) {
	const pathname = usePathname()
	const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
	const Icon = item.icon
	const [hovered, setHovered] = useState(false)

	return (
		<motion.div
			variants={sidebarNavItem}
			className="relative"
			onHoverStart={() => setHovered(true)}
			onHoverEnd={() => setHovered(false)}
		>
			<Link
				href={item.href}
				onClick={onClick}
				className={cn(
					"relative flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium tracking-wider uppercase",
					collapsed && "justify-center px-0",
				)}
			>
				{/* Active indicator — animated pill */}
				{isActive && (
					<motion.div
						layoutId="sidebar-active"
						className="absolute inset-0 rounded-md bg-v7-amethyste/10 border-l-[3px] border-v7-amethyste"
						transition={springSnappy}
					/>
				)}

				{/* Hover indicator */}
				{!isActive && hovered && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 rounded-md bg-v7-amethyste/5"
					/>
				)}

				<span
					className={cn(
						"relative z-10 flex items-center gap-3",
						isActive ? "text-white" : "text-sidebar-foreground/60",
						hovered && !isActive && "text-sidebar-foreground/90",
						collapsed && "gap-0",
					)}
				>
					<Icon className="h-[18px] w-[18px] shrink-0" />
					<AnimatePresence mode="wait">
						{!collapsed && (
							<motion.span
								initial={{ opacity: 0, width: 0 }}
								animate={{ opacity: 1, width: "auto" }}
								exit={{ opacity: 0, width: 0 }}
								transition={{ duration: 0.15 }}
								className="overflow-hidden whitespace-nowrap"
							>
								{item.label}
							</motion.span>
						)}
					</AnimatePresence>
				</span>
			</Link>

			{/* Tooltip on collapsed hover */}
			{collapsed && <NavTooltip label={item.label} show={hovered} />}
		</motion.div>
	)
}

function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
	if (collapsed) {
		return <div className="h-px bg-sidebar-border/30 mx-3" />
	}

	return (
		<div className="px-3 pb-1">
			<span className="text-[10px] font-medium tracking-wider uppercase text-sidebar-foreground/30">
				{label}
			</span>
		</div>
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
	const { sections } = useCurrentUser()

	const visibleSections = NAV_SECTIONS.filter((section) => sections.includes(section.key))

	return (
		<div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
			{/* Logo */}
			<div className="flex items-center justify-center px-5 py-5 h-16">
				<AnimatePresence mode="wait">
					{collapsed ? (
						<motion.span
							key="collapsed-logo"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={springSmooth}
							className="text-base font-bold tracking-widest uppercase text-white/90 font-cabin"
						>
							V7
						</motion.span>
					) : (
						<motion.div
							key="expanded-logo"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="flex items-center"
						>
							<Image
								src="/logos/v7lvet-emeraude.svg"
								alt="V7LVET"
								width={120}
								height={36}
								className="brightness-0 invert"
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Separator */}
			<div className={cn("h-px bg-sidebar-border/40", collapsed ? "mx-3" : "mx-5")} />

			{/* Navigation */}
			<LayoutGroup>
				<div
					className={cn(
						"flex-1 py-4 overflow-y-auto overflow-x-hidden",
						collapsed ? "px-3" : "px-4",
					)}
				>
					{visibleSections.map((section, sectionIndex) => (
						<div key={section.key} className={cn(sectionIndex > 0 && "mt-4")}>
							<SectionHeader label={section.label} collapsed={collapsed} />
							<motion.nav
								variants={staggerContainer}
								initial="hidden"
								animate="show"
								className="space-y-0.5"
							>
								{section.items.map((item) => (
									<NavLink
										key={item.href}
										item={item}
										collapsed={collapsed}
										onClick={onLinkClick}
									/>
								))}
							</motion.nav>
						</div>
					))}
				</div>
			</LayoutGroup>

			{/* Bottom section */}
			<div
				className={cn(
					"border-t border-sidebar-border/40 py-3 space-y-2",
					collapsed ? "px-3" : "px-4",
				)}
			>
				{/* Collapse toggle */}
				{onToggle && (
					<motion.button
						type="button"
						onClick={onToggle}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/40 hover:bg-v7-amethyste/5 hover:text-sidebar-foreground/80"
					>
						<motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={springSnappy}>
							<ChevronsRight className="h-4 w-4" />
						</motion.div>
					</motion.button>
				)}

				{/* Notifications + User Menu */}
				<div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "px-1")}>
					<NotificationBell />
					<AnimatePresence mode="wait">
						{collapsed ? (
							<motion.div
								key="collapsed-user"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								<UserMenu collapsed />
							</motion.div>
						) : (
							<motion.div
								key="expanded-user"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="flex-1 min-w-0"
							>
								<UserMenu />
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	)
}

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)

	return (
		<>
			{/* Desktop sidebar — Framer Motion layout animation */}
			<motion.aside
				className="hidden md:flex h-screen shrink-0 overflow-hidden"
				animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
				transition={springSmooth}
			>
				<SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
			</motion.aside>

			{/* Mobile: hamburger + sheet */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-sidebar-border/60 bg-sidebar px-4 py-2.5">
				<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-v7-amethyste/5 h-9 w-9"
						>
							<AnimatePresence mode="wait">
								{mobileOpen ? (
									<motion.div
										key="close"
										initial={{ rotate: -90, opacity: 0 }}
										animate={{ rotate: 0, opacity: 1 }}
										exit={{ rotate: 90, opacity: 0 }}
										transition={springSnappy}
									>
										<X className="h-5 w-5" />
									</motion.div>
								) : (
									<motion.div
										key="menu"
										initial={{ rotate: 90, opacity: 0 }}
										animate={{ rotate: 0, opacity: 1 }}
										exit={{ rotate: -90, opacity: 0 }}
										transition={springSnappy}
									>
										<Menu className="h-5 w-5" />
									</motion.div>
								)}
							</AnimatePresence>
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-[264px] p-0 bg-sidebar border-sidebar-border">
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
