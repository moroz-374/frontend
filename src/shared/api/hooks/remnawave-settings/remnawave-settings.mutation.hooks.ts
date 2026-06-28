import { UpdateRemnawaveSettingsCommand } from '@remnawave/backend-contract'
import { notifications } from '@mantine/notifications'

import { createMutationHook } from '../../tsq-helpers'
import { TrafficAuditSettingsSchema } from './traffic-audit-settings.schema'
import { GetRemnawaveSettingsWithTrafficAuditSchema } from './remnawave-settings.query.hooks'

export const UpdateRemnawaveSettingsWithTrafficAuditSchema =
    UpdateRemnawaveSettingsCommand.RequestSchema.extend({
        trafficAuditSettings: TrafficAuditSettingsSchema.optional()
    })

export const useUpdateRemnawaveSettings = createMutationHook({
    endpoint: UpdateRemnawaveSettingsCommand.TSQ_url,
    bodySchema: UpdateRemnawaveSettingsWithTrafficAuditSchema,
    responseSchema: GetRemnawaveSettingsWithTrafficAuditSchema,
    requestMethod: UpdateRemnawaveSettingsCommand.endpointDetails.REQUEST_METHOD,
    rMutationParams: {
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Remnawave settings updated successfully',
                color: 'teal'
            })
        }
    }
})
