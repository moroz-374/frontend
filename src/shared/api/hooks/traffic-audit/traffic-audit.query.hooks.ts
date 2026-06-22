import { createQueryKeys } from '@lukemorales/query-key-factory'
import { useQuery } from '@tanstack/react-query'

import { getTrafficAuditLogs } from '@shared/api/traffic-audit'
import { sToMs } from '@shared/utils/time-utils'

export const trafficAuditQueryKeys = createQueryKeys('traffic-audit', {
    logs: (params: { userUuid: string; cursor?: string; limit?: number }) => ({
        queryKey: [params]
    })
})

export const useGetTrafficAuditLogs = (params: {
    userUuid: string
    cursor?: string
    limit?: number
    enabled?: boolean
}) => {
    const { enabled = true, ...query } = params

    return useQuery({
        queryKey: trafficAuditQueryKeys.logs(query).queryKey,
        queryFn: () => getTrafficAuditLogs(query),
        enabled: enabled && Boolean(query.userUuid),
        staleTime: sToMs(10)
    })
}