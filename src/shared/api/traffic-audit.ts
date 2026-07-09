import { instance } from '@shared/api'

export interface TrafficLogItem {
    destination: string
    destinationType: 'DOMAIN' | 'IPV4' | 'IPV6' | 'UNKNOWN'
    id: string
    network: 'tcp' | 'udp'
    nodeUuid: string
    originalDestination: null | string
    originalDestinationType: 'DOMAIN' | 'IPV4' | 'IPV6' | 'UNKNOWN' | null
    port: number
    requestedAt: string
    sniffedProtocol: 'fakedns' | 'fakedns+others' | 'http' | 'quic' | 'tls' | null
}

export interface TrafficLogPage {
    items: TrafficLogItem[]
    nextCursor: null | string
}

export interface TrafficLogFilters {
    destination?: string
    destinationType?: TrafficLogItem['destinationType']
    from?: string
    network?: TrafficLogItem['network']
    nodeUuid?: string
    port?: number
    to?: string
}

export async function updateTrafficAudit(userUuid: string, enabled: boolean) {
    const { data } = await instance.patch<{
        response: {
            isAuditEnabled: boolean
            uuid: string
        }
    }>(`/api/users/${userUuid}/traffic-audit`, {
        enabled
    })

    return data.response
}

export async function getTrafficAuditLogs(
    params: TrafficLogFilters & {
        cursor?: string
        limit?: number
        userUuid: string
    }
) {
    const { userUuid, ...query } = params

    const { data } = await instance.get<{
        response: TrafficLogPage
    }>(`/api/users/${userUuid}/traffic-audit/logs`, {
        params: query
    })

    return data.response
}
