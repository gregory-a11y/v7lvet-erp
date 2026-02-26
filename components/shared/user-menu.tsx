"use client"

import { useQuery } from "convex/react"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/convex/_generated/api"
import { signOut, useSession } from "@/lib/auth-client"
import { useIsUserOnline } from "@/lib/hooks/use-presence"
import { OnlineIndicator } from "./online-indicator"

export function UserMenu({ collapsed }: { collapsed?: boolean }) {
	const router = useRouter()
	const { data: session } = useSession()
	const myProfile = useQuery(api.users.getMyProfile)
	const isOnline = useIsUserOnline(myProfile?.id)

	if (!session?.user) return null

	const user = session.user
	const initials = (user.name ?? user.email ?? "U")
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)

	async function handleSignOut() {
		await signOut()
		router.push("/login")
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors outline-none w-full min-w-0">
				<div className="relative shrink-0">
					<Avatar className="h-8 w-8">
						{myProfile?.avatarUrl && (
							<AvatarImage src={myProfile.avatarUrl} alt={user.name ?? "Avatar"} />
						)}
						<AvatarFallback className="bg-v7-emeraude text-white text-xs font-medium">
							{initials}
						</AvatarFallback>
					</Avatar>
					<OnlineIndicator
						isOnline={isOnline}
						size="sm"
						className="absolute -bottom-0.5 -right-0.5"
					/>
				</div>
				{!collapsed && (
					<div className="flex-1 min-w-0 text-left">
						<p className="text-sm text-sidebar-foreground truncate leading-tight">
							{user.name ?? user.email}
						</p>
						{user.name && user.email && (
							<p className="text-[11px] text-sidebar-foreground/40 truncate leading-tight">
								{user.email}
							</p>
						)}
					</div>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={collapsed ? "center" : "end"}
				side={collapsed ? "right" : "top"}
				sideOffset={8}
				className="w-52"
			>
				<div className="px-3 py-2 flex items-center gap-2">
					<div className="relative shrink-0">
						<Avatar className="h-9 w-9">
							{myProfile?.avatarUrl && (
								<AvatarImage src={myProfile.avatarUrl} alt={user.name ?? "Avatar"} />
							)}
							<AvatarFallback className="bg-v7-emeraude text-white text-xs font-medium">
								{initials}
							</AvatarFallback>
						</Avatar>
						<OnlineIndicator
							isOnline={isOnline}
							size="sm"
							className="absolute -bottom-0.5 -right-0.5 border-white"
						/>
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium truncate">{user.name ?? "Utilisateur"}</p>
						<p className="text-xs text-muted-foreground truncate">{user.email}</p>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => router.push("/profil")}>
					<User className="mr-2 h-4 w-4" />
					Mon profil
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-destructive focus:text-destructive"
				>
					<LogOut className="mr-2 h-4 w-4" />
					Se déconnecter
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
