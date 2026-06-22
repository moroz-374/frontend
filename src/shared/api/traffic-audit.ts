import { instance } from '@shared/api'

export interface TrafficLogItem {
    id: string
    destination: string
    destinationType: 'DOMAIN' | 'IPV4' | 'IPV6' | 'UNKNOWN'
    network: 'tcp' | 'udp'
    port: number
    requestedAt: string
    nodeUuid: string
}

export interface TrafficLogPage {
    items: TrafficLogItem[]
    nextCursor: string | null
}

export async function updateTrafficAudit(userUuid: string, enabled: boolean) {
    const { data } = await instance.patch<{
        response: {
            uuid: string
            isAuditEnabled: boolean
        }
    }>(`/api/users/${userUuid}/traffic-audit`, {
        enabled
    })

    return data.response
}

export async function getTrafficAuditLogs(params: {
    userUuid: string
    cursor?: string
    limit?: number
}) {
    const { userUuid, ...query } = params

    const { data } = await instance.get<{
        response: TrafficLogPage
    }>(`/api/users/${userUuid}/traffic-audit/logs`, {
        params: query
    })

    return data.response
}