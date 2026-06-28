import { z } from 'zod'

export const TrafficAuditHideRuleSchema = z.object({
    type: z.enum(['EXACT', 'SUFFIX', 'GLOB']),
    pattern: z.string().trim().min(1).max(253)
})

export const TrafficAuditSettingsSchema = z.object({
    hideRules: z.array(TrafficAuditHideRuleSchema).max(200)
})

export type TrafficAuditSettings = z.infer<typeof TrafficAuditSettingsSchema>
