import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@shared/api'
import { updateTrafficAudit } from '@shared/api/traffic-audit'

import { usersQueryKeys } from '../users/users.query.hooks'
import { trafficAuditQueryKeys } from './traffic-audit.query.hooks'

export const useUpdateTrafficAudit = () => {
    return useMutation({
        mutationFn: (variables: { userUuid: string; enabled: boolean }) =>
            updateTrafficAudit(variables.userUuid, variables.enabled),

        onSuccess: (data, variables) => {
            queryClient.setQueryData(
                usersQueryKeys.getUserByUuid({
                    uuid: variables.userUuid
                }).queryKey,
                (oldData) => {
                    if (!oldData || typeof oldData !== 'object') {
                        return oldData
                    }

                    return {
                        ...oldData,
                        isAuditEnabled: data.isAuditEnabled
                    }
                }
            )

            queryClient.invalidateQueries({
                queryKey: trafficAuditQueryKeys.logs._def
            })

            notifications.show({
                title: 'Success',
                message: data.isAuditEnabled ? 'Traffic audit enabled' : 'Traffic audit disabled',
                color: 'teal'
            })
        },

        onError: (error) => {
            notifications.show({
                title: 'Traffic Audit',
                message:
                    error instanceof Error ? error.message : 'Request failed with unknown error.',
                color: 'red'
            })
        }
    })
}
