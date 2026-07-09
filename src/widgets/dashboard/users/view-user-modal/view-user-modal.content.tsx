import type { TFunction } from 'i18next'

import {
    Button,
    Card,
    em,
    Group,
    Menu,
    NumberInput,
    px,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import { UpdateUserCommand } from '@remnawave/backend-contract'
import { zodResolver } from 'mantine-form-zod-resolver'
import { PiFloppyDiskDuotone } from 'react-icons/pi'
import { useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { TbDots } from 'react-icons/tb'
import { useForm } from '@mantine/form'
import { motion } from 'motion/react'
import dayjs from 'dayjs'

import {
    useGetExternalSquads,
    useGetInternalSquads,
    useGetNodes,
    useGetTrafficAuditLogs,
    useGetUserByUuid,
    useGetUserTags,
    usersQueryKeys,
    useUpdateTrafficAudit,
    useUpdateUser
} from '@shared/api/hooks'
import {
    AccessSettingsCard,
    ContactInformationCard,
    DeviceTagSettingsCard,
    TrafficLimitsCard,
    UserIdentificationCard
} from '@shared/ui/forms/users/forms-components'
import { ToggleUserStatusButtonFeature } from '@features/ui/dashboard/users/toggle-user-status-button'
import { RevokeSubscriptionUserFeature } from '@features/ui/dashboard/users/revoke-subscription-user'
import { useUserModalStoreActions } from '@entities/dashboard/user-modal-store/user-modal-store'
import { ResetUsageUserFeature } from '@features/ui/dashboard/users/reset-usage-user'
import { TrafficLogFilters, TrafficLogItem } from '@shared/api/traffic-audit'
import { DeleteUserFeature } from '@features/ui/dashboard/users/delete-user'
import { bytesToGbUtil, gbToBytesUtil } from '@shared/utils/bytes'
import { LoaderModalShared } from '@shared/ui/loader-modal'
import { handleFormErrors } from '@shared/utils/misc'
import { ModalFooter } from '@shared/ui/modal-footer'
import { queryClient } from '@shared/api'

const MotionWrapper = motion.div
const MotionStack = motion.create(Stack)

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3 }
    }
}

const getSniffedProtocolLabel = (
    protocol: TrafficLogItem['sniffedProtocol'],
    t: TFunction
) => {
    if (!protocol) {
        return null
    }

    return t(`traffic-audit.sniffed-protocol.${protocol}`)
}

const getTrafficAuditDestinationHint = (item: TrafficLogItem, t: TFunction) => {
    const sniffedSource = getSniffedProtocolLabel(item.sniffedProtocol, t)

    if (item.originalDestination && sniffedSource) {
        return t('traffic-audit.original-with-source', {
            destination: item.originalDestination,
            source: sniffedSource
        })
    }

    if (item.originalDestination) {
        return t('traffic-audit.original', {
            destination: item.originalDestination
        })
    }

    if (item.destinationType === 'IPV4' || item.destinationType === 'IPV6') {
        return t('traffic-audit.ip-only')
    }

    if (item.destinationType === 'UNKNOWN') {
        return t('traffic-audit.no-confirmed-domain')
    }

    return null
}

interface IProps {
    userUuid: string
}

export const ViewUserModalContent = (props: IProps) => {
    const { userUuid } = props

    const { t } = useTranslation()

    const actions = useUserModalStoreActions()

    const isMobile = useMediaQuery(`(max-width: ${em(768)})`)

    const { data: internalSquads } = useGetInternalSquads()
    const { data: externalSquads } = useGetExternalSquads()
    const { data: nodes } = useGetNodes()
    const { data: tags } = useGetUserTags()
    const [trafficAuditFilters, setTrafficAuditFilters] = useState<
        TrafficLogFilters & { fromLocal?: string; toLocal?: string }
    >({})

    const trafficAuditApiFilters = useMemo<TrafficLogFilters>(
        () => ({
            destination: trafficAuditFilters.destination || undefined,
            destinationType: trafficAuditFilters.destinationType,
            nodeUuid: trafficAuditFilters.nodeUuid,
            network: trafficAuditFilters.network,
            port: trafficAuditFilters.port,
            from: trafficAuditFilters.fromLocal
                ? dayjs(trafficAuditFilters.fromLocal).toISOString()
                : undefined,
            to: trafficAuditFilters.toLocal
                ? dayjs(trafficAuditFilters.toLocal).toISOString()
                : undefined
        }),
        [trafficAuditFilters]
    )

    const form = useForm<UpdateUserCommand.Request>({
        name: 'edit-user-form',
        mode: 'uncontrolled',
        onValuesChange: (values) => {
            if (typeof values.telegramId === 'string' && values.telegramId === '') {
                form.setFieldValue('telegramId', null)
            }
            if (typeof values.email === 'string' && values.email === '') {
                form.setFieldValue('email', null)
            }
        },
        validate: zodResolver(
            UpdateUserCommand.RequestSchema._def.schema.omit({
                expireAt: true,
                hwidDeviceLimit: true
            })
        )
    })

    const { data: user, isError } = useGetUserByUuid({
        route: {
            uuid: userUuid
        }
    })

    const {
        data: trafficAuditLogs,
        fetchNextPage: fetchNextTrafficAuditPage,
        hasNextPage: hasNextTrafficAuditPage,
        isFetching: isTrafficAuditLogsFetching,
        isFetchingNextPage: isFetchingNextTrafficAuditPage
    } = useGetTrafficAuditLogs({
        userUuid,
        limit: 50,
        filters: trafficAuditApiFilters,
        enabled: Boolean(user?.isAuditEnabled)
    })

    const trafficAuditItems = trafficAuditLogs?.pages.flatMap((page) => page.items) ?? []

    const { mutate: updateTrafficAudit, isPending: isUpdateTrafficAuditPending } =
        useUpdateTrafficAudit()

    const { mutate: updateUser, isPending: isUpdateUserPending } = useUpdateUser({
        mutationFns: {
            onSuccess: (data) => {
                queryClient.refetchQueries({
                    queryKey: usersQueryKeys.getUserAccessibleNodes({
                        uuid: userUuid
                    }).queryKey
                })
                queryClient.setQueryData(
                    usersQueryKeys.getUserByUuid({
                        uuid: userUuid
                    }).queryKey,
                    data
                )
                form.resetTouched()
            },

            onError: (error) => {
                handleFormErrors(form, error)
            }
        }
    })

    useEffect(() => {
        if (user && internalSquads) {
            const activeInternalSquads = user.activeInternalSquads.map(
                (internalSquad) => internalSquad.uuid
            )

            form.initialize({
                uuid: user.uuid,
                trafficLimitBytes: bytesToGbUtil(user.trafficLimitBytes),
                trafficLimitStrategy: user.trafficLimitStrategy,
                expireAt: user.expireAt,
                activeInternalSquads,
                description: user.description ?? '',
                telegramId: user.telegramId ?? undefined,
                email: user.email ?? undefined,
                hwidDeviceLimit: user.hwidDeviceLimit ?? undefined,
                tag: user.tag ?? undefined,
                externalSquadUuid: user.externalSquadUuid ?? undefined
            })
        }
    }, [user, internalSquads])

    useEffect(() => {
        if (isError) {
            actions.clearModalState()
        }
    }, [isError])

    const handleSubmit = form.onSubmit(async (values) => {
        const touchedFields = form.getTouched()

        updateUser({
            variables: {
                uuid: values.uuid,
                trafficLimitStrategy: touchedFields.trafficLimitStrategy
                    ? values.trafficLimitStrategy
                    : undefined,
                trafficLimitBytes: touchedFields.trafficLimitBytes
                    ? gbToBytesUtil(values.trafficLimitBytes)
                    : undefined,
                // @ts-expect-error - TODO: fix ZOD schema
                expireAt: touchedFields.expireAt ? dayjs(values.expireAt).toISOString() : undefined,
                activeInternalSquads: touchedFields.activeInternalSquads
                    ? values.activeInternalSquads
                    : undefined,
                description: touchedFields.description ? values.description : undefined,
                // @ts-expect-error - TODO: fix ZOD schema
                telegramId: values.telegramId === '' ? null : values.telegramId,
                email: values.email === '' ? null : values.email,
                // @ts-expect-error - TODO: fix ZOD schema
                hwidDeviceLimit: values.hwidDeviceLimit === '' ? null : values.hwidDeviceLimit,
                // eslint-disable-next-line no-nested-ternary
                tag: touchedFields.tag ? (values.tag === '' ? null : values.tag) : undefined,
                externalSquadUuid: touchedFields.externalSquadUuid
                    ? values.externalSquadUuid
                    : undefined
            }
        })
    })

    if (!user || !nodes || !tags || !internalSquads || !externalSquads) {
        return (
            <motion.div
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <LoaderModalShared h="78vh" />
            </motion.div>
        )
    }

    const lastConnectedNode = nodes.find((n) => n.uuid === user.userTraffic.lastConnectedNodeUuid)

    const trafficAuditCard = (
        <MotionWrapper variants={cardVariants}>
            <Card withBorder>
                <Stack gap="md">
                    <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2}>
                            <Text fw={500}>{t('traffic-audit.title')}</Text>
                            <Text c="dimmed" size="sm">
                                {t('traffic-audit.description')}
                            </Text>
                        </Stack>

                        <Switch
                            checked={Boolean(user.isAuditEnabled)}
                            disabled={isUpdateTrafficAuditPending}
                            onChange={(event) => {
                                updateTrafficAudit({
                                    userUuid: user.uuid,
                                    enabled: event.currentTarget.checked
                                })
                            }}
                        />
                    </Group>

                    {Boolean(user.isAuditEnabled) && (
                        <Stack gap="xs">
                            <Group grow>
                                <TextInput
                                    label={t('traffic-audit.destination')}
                                    onChange={(event) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            destination: event.currentTarget.value
                                        }))
                                    }
                                    value={trafficAuditFilters.destination ?? ''}
                                />
                                <Select
                                    clearable
                                    data={['DOMAIN', 'IPV4', 'IPV6', 'UNKNOWN']}
                                    label={t('traffic-audit.type')}
                                    onChange={(value) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            destinationType:
                                                (value as TrafficLogFilters['destinationType']) ||
                                                undefined
                                        }))
                                    }
                                    value={trafficAuditFilters.destinationType ?? null}
                                />
                            </Group>
                            <Group grow>
                                <TextInput
                                    label={t('traffic-audit.from')}
                                    onChange={(event) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            fromLocal: event.currentTarget.value
                                        }))
                                    }
                                    type="datetime-local"
                                    value={trafficAuditFilters.fromLocal ?? ''}
                                />
                                <TextInput
                                    label={t('traffic-audit.to')}
                                    onChange={(event) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            toLocal: event.currentTarget.value
                                        }))
                                    }
                                    type="datetime-local"
                                    value={trafficAuditFilters.toLocal ?? ''}
                                />
                            </Group>
                            <Group grow>
                                <Select
                                    clearable
                                    data={nodes.map((node) => ({
                                        value: node.uuid,
                                        label: node.name
                                    }))}
                                    label={t('traffic-audit.node')}
                                    onChange={(value) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            nodeUuid: value || undefined
                                        }))
                                    }
                                    searchable
                                    value={trafficAuditFilters.nodeUuid ?? null}
                                />
                                <Select
                                    clearable
                                    data={['tcp', 'udp']}
                                    label={t('traffic-audit.network')}
                                    onChange={(value) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            network:
                                                (value as TrafficLogFilters['network']) || undefined
                                        }))
                                    }
                                    value={trafficAuditFilters.network ?? null}
                                />
                                <NumberInput
                                    allowDecimal={false}
                                    allowNegative={false}
                                    label={t('traffic-audit.port')}
                                    max={65535}
                                    min={1}
                                    onChange={(value) =>
                                        setTrafficAuditFilters((current) => ({
                                            ...current,
                                            port: typeof value === 'number' ? value : undefined
                                        }))
                                    }
                                    value={trafficAuditFilters.port ?? ''}
                                />
                            </Group>

                            <Button onClick={() => setTrafficAuditFilters({})} variant="subtle">
                                {t('traffic-audit.clear-filters')}
                            </Button>

                            {isTrafficAuditLogsFetching && (
                                <Text c="dimmed" size="sm">
                                    {t('traffic-audit.loading')}
                                </Text>
                            )}

                            {!isTrafficAuditLogsFetching && !trafficAuditItems.length && (
                                <Text c="dimmed" size="sm">
                                    {t('traffic-audit.empty')}
                                </Text>
                            )}

                            {Boolean(trafficAuditItems.length) && (
                                <Table fz="xs">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>{t('traffic-audit.time')}</Table.Th>
                                            <Table.Th>{t('traffic-audit.destination')}</Table.Th>
                                            <Table.Th>{t('traffic-audit.type')}</Table.Th>
                                            <Table.Th>{t('traffic-audit.node')}</Table.Th>
                                            <Table.Th>{t('traffic-audit.network')}</Table.Th>
                                            <Table.Th>{t('traffic-audit.port')}</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>
                                        {trafficAuditItems.map((item) => {
                                            const destinationHint = getTrafficAuditDestinationHint(
                                                item,
                                                t
                                            )

                                            return (
                                                <Table.Tr key={item.id}>
                                                    <Table.Td>
                                                        {dayjs(item.requestedAt).format(
                                                            'YYYY-MM-DD HH:mm:ss'
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Stack gap={2}>
                                                            <Text fz="xs">{item.destination}</Text>
                                                            {destinationHint && (
                                                                <Tooltip
                                                                    disabled={
                                                                        !item.originalDestination
                                                                    }
                                                                    label={destinationHint}
                                                                    multiline
                                                                    withArrow
                                                                >
                                                                    <Text c="dimmed" fz="xs">
                                                                        {destinationHint}
                                                                    </Text>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </Table.Td>
                                                    <Table.Td>{item.destinationType}</Table.Td>
                                                    <Table.Td>
                                                        {nodes.find(
                                                            (node) => node.uuid === item.nodeUuid
                                                        )?.name ?? item.nodeUuid}
                                                    </Table.Td>
                                                    <Table.Td>{item.network}</Table.Td>
                                                    <Table.Td>{item.port}</Table.Td>
                                                </Table.Tr>
                                            )
                                        })}
                                    </Table.Tbody>
                                </Table>
                            )}

                            {hasNextTrafficAuditPage && (
                                <Button
                                    loading={isFetchingNextTrafficAuditPage}
                                    onClick={() => fetchNextTrafficAuditPage()}
                                    variant="light"
                                >
                                    {t('traffic-audit.load-more')}
                                </Button>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Card>
        </MotionWrapper>
    )

    return (
        <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{
                duration: 0.4,
                ease: 'easeInOut'
            }}
        >
            {isMobile && (
                <MotionStack
                    animate="visible"
                    gap="md"
                    initial="hidden"
                    variants={containerVariants}
                >
                    <UserIdentificationCard
                        cardVariants={cardVariants}
                        lastConnectedNode={lastConnectedNode}
                        motionWrapper={MotionWrapper}
                        user={user}
                    />
                    <TrafficLimitsCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />
                    <AccessSettingsCard
                        cardVariants={cardVariants}
                        externalSquads={externalSquads}
                        form={form}
                        internalSquads={internalSquads}
                        motionWrapper={MotionWrapper}
                    />
                    {trafficAuditCard}
                    <ContactInformationCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />
                    <DeviceTagSettingsCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                        tags={tags}
                    />
                </MotionStack>
            )}

            {!isMobile && (
                <Group align="flex-start" gap="md" grow={false} wrap="wrap">
                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 450px' }}
                        variants={containerVariants}
                    >
                        <UserIdentificationCard
                            cardVariants={cardVariants}
                            lastConnectedNode={lastConnectedNode}
                            motionWrapper={MotionWrapper}
                            user={user}
                        />
                        <ContactInformationCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                        <DeviceTagSettingsCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                            tags={tags}
                        />
                    </MotionStack>

                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 450px' }}
                        variants={containerVariants}
                    >
                        <TrafficLimitsCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                        <AccessSettingsCard
                            cardVariants={cardVariants}
                            externalSquads={externalSquads}
                            form={form}
                            internalSquads={internalSquads}
                            motionWrapper={MotionWrapper}
                        />
                        {trafficAuditCard}
                    </MotionStack>
                </Group>
            )}

            <ModalFooter isMobile={isMobile}>
                <Menu keepMounted position="top-end" shadow="md">
                    <Menu.Target>
                        <Button color="gray" leftSection={<TbDots size={px('1.2rem')} />} size="md">
                            {t('view-user-modal.widget.more-actions')}
                        </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>{t('view-user-modal.widget.danger-zone')}</Menu.Label>
                        <DeleteUserFeature userUuid={user.uuid} />

                        <Menu.Divider />
                        <Menu.Label>{t('view-user-modal.widget.management')}</Menu.Label>
                        <ToggleUserStatusButtonFeature user={user} />
                        <ResetUsageUserFeature userUuid={user.uuid} />
                        <RevokeSubscriptionUserFeature userUuid={user.uuid} />
                    </Menu.Dropdown>
                </Menu>

                <Button
                    color="teal"
                    leftSection={<PiFloppyDiskDuotone size="16px" />}
                    loading={isUpdateUserPending}
                    onClick={() => {
                        handleSubmit()
                    }}
                    size="md"
                    variant="light"
                >
                    {t('common.save')}
                </Button>
            </ModalFooter>
        </motion.div>
    )
}
