import type { NextConfig } from "next"

const securityHeaders = [
	{ key: "X-DNS-Prefetch-Control", value: "on" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	// CSP is now handled dynamically in middleware.ts with per-request nonces
]

const nextConfig: NextConfig = {
	output: "standalone",
	experimental: {
		optimizePackageImports: [
			"lucide-react",
			"recharts",
			"date-fns",
			"framer-motion",
			"@xyflow/react",
			"@hello-pangea/dnd",
		],
	},
	async headers() {
		return [{ source: "/(.*)", headers: securityHeaders }]
	},
}

export default nextConfig
