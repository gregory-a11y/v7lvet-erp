import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Chaque jour à 7h00 UTC — vérifie les échéances de tâches et génère les notifications
crons.daily("check-echeances", { hourUTC: 7, minuteUTC: 0 }, internal.notifications.checkEcheances)

export default crons
