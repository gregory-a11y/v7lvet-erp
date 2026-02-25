"use client"

import { useRouter } from "next/navigation"
import { signOut, useSession } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
	const router = useRouter()
	const { data: session } = useSession()

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
			<DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors outline-none">
				<Avatar className="h-8 w-8">
					<AvatarFallback className="bg-primary text-primary-foreground text-xs">
						{initials}
					</AvatarFallback>
				</Avatar>
				<span className="text-sm text-sidebar-foreground hidden md:inline">
					{user.name ?? user.email}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem onClick={() => router.push("/profil")}>
					<User className="mr-2 h-4 w-4" />
					Mon profil
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} className="text-destructive">
					<LogOut className="mr-2 h-4 w-4" />
					Se déconnecter
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
