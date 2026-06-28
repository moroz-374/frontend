import { createQueryKeys } from '@lukemorales/query-key-factory'
import { useInfiniteQuery } from '@tanstack/react-query'

import { getTrafficAuditLogs, TrafficLogFilters } from '@shared/api/traffic-audit'
import { sToMs } from '@shared/utils/time-utils'

export const trafficAuditQueryKeys = createQueryKeys('traffic-audit', {
    logs: (params: { userUuid: string; limit?: number; filters?: TrafficLogFilters }) => ({
        queryKey: [params]
    })
})

export const useGetTrafficAuditLogs = (params: {
    userUuid: string
    limit?: number
    enabled?: boolean
    filters?: TrafficLogFilters
}) => {
    const { enabled = true, filters = {}, ...query } = params

    return useInfiniteQuery({
        queryKey: trafficAuditQueryKeys.logs({ ...query, filters }).queryKey,
        queryFn: ({ pageParam }) =>
            getTrafficAuditLogs({ ...query, ...filters, cursor: pageParam ?? undefined }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: enabled && Boolean(query.userUuid),
        staleTime: sToMs(10)
    })
}
