import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useTeamMembers() {
	const members = useQuery(api.equipe.listMembers)

	const getMemberName = (userId: string | undefined): string => {
		if (!userId) return "—"
		const member = members?.find((m) => m.userId === userId)
		return member?.nom ?? "—"
	}

	return { members, getMemberName, isLoading: members === undefined }
}
