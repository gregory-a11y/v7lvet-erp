import type { Metadata } from "next"
import { Cabin, Geist_Mono, Inter } from "next/font/google"
import { getToken } from "@/lib/auth-server"
import { Providers } from "./providers"
import "./globals.css"

const cabin = Cabin({
	variable: "--font-cabin",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
})

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "V7LVET ERP",
	description: "Centraliser la gestion clients, piloter l'équipe, gérer projets et workflows",
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const token = await getToken()

	return (
		<html lang="fr" className={`${cabin.variable} ${inter.variable} ${geistMono.variable}`}>
			<body className={`${inter.className} antialiased`}>
				<Providers initialToken={token}>{children}</Providers>
			</body>
		</html>
	)
}
