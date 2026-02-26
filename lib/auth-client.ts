import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
	plugins: [convexClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient

export const changePassword = authClient.changePassword
export const updateUser = authClient.updateUser
export const requestPasswordReset = authClient.requestPasswordReset
export const resetPassword = authClient.resetPassword
