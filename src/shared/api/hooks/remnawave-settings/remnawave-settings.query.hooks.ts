import { GetRemnawaveSettingsCommand } from '@remnawave/backend-contract'
import { createQueryKeys } from '@lukemorales/query-key-factory'
import { z } from 'zod'

import { sToMs } from '@shared/utils/time-utils'

import { createGetQueryHook, errorHandler } from '../../tsq-helpers'
import { TrafficAuditSettingsSchema } from './traffic-audit-settings.schema'

export const GetRemnawaveSettingsWithTrafficAuditSchema =
    GetRemnawaveSettingsCommand.ResponseSchema.extend({
        response: GetRemnawaveSettingsCommand.ResponseSchema.shape.response.extend({
            trafficAuditSettings: TrafficAuditSettingsSchema.nullable()
        })
    })

export type RemnawaveSettingsWithTrafficAudit = z.infer<
    typeof GetRemnawaveSettingsWithTrafficAuditSchema
>['response']

export const remnawaveSettingsQueryKeys = createQueryKeys('remnawaveSettings', {
    getRemnawaveSettings: {
        queryKey: null
    }
})

export const useGetRemnawaveSettings = createGetQueryHook({
    endpoint: GetRemnawaveSettingsCommand.TSQ_url,
    responseSchema: GetRemnawaveSettingsWithTrafficAuditSchema,
    getQueryKey: () => remnawaveSettingsQueryKeys.getRemnawaveSettings.queryKey,
    rQueryParams: {
        refetchOnMount: false,
        staleTime: sToMs(30)
    },
    errorHandler: (error) => errorHandler(error, 'Get Remnawave Settings')
})
