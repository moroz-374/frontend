import {
    GetNodePluginsCommand,
    GetOneNodeCommand,
    GetPubKeyCommand,
    UpdateNodeCommand
} from '@remnawave/backend-contract'
import { Alert, Button, CopyButton, em, Group, Menu, px, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { PiFloppyDiskDuotone } from 'react-icons/pi'
import { UseFormReturnType } from '@mantine/form'
import { TbCopy, TbDots, TbKey } from 'react-icons/tb'
import { useMediaQuery } from '@mantine/hooks'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { t } from 'i18next'

import { ToggleNodeStatusButtonFeature } from '@features/ui/dashboard/nodes/toggle-node-status-button'
import { RestartNodeButtonFeature } from '@features/ui/dashboard/nodes/restart-node-button'
import { ResetNodeTrafficFeature } from '@features/ui/dashboard/nodes/reset-node-traffic'
import { ModalAccordionWidget } from '@widgets/dashboard/nodes/modal-accordeon-widget'
import { DeleteNodeFeature } from '@features/ui/dashboard/nodes/delete-node'
import { ModalFooter } from '@shared/ui/modal-footer'
import { useRotateTrafficAuditCredential } from '@shared/api/hooks'
import { CopyableCodeBlock } from '@shared/ui/copyable-code-block'

import { NodeTrackingAndBillingCard } from './node-tracking-and-billing.card'
import { NodeConfigProfilesCard } from './node-config-profiles.card'
import { NodeConsumptionCard } from './node-consumption.card'
import { NodeVitalsCard } from './node-vitals.card'

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

interface IProps<T extends UpdateNodeCommand.Request> {
    form: UseFormReturnType<T>
    handleClose: () => void
    handleSubmit: () => void
    isDataSubmitting: boolean
    node: GetOneNodeCommand.Response['response'] & { isTrafficAuditConfigured: boolean }
    nodeDetailsCard?: ReactNode
    nodePlugins: GetNodePluginsCommand.Response['response']['nodePlugins']
    nodeSystemCard?: ReactNode
    pubKey: GetPubKeyCommand.Response['response'] | undefined
}

export const BaseNodeForm = <T extends UpdateNodeCommand.Request>(props: IProps<T>) => {
    const {
        form,
        node,
        nodePlugins,
        pubKey,
        nodeDetailsCard,
        nodeSystemCard,
        handleClose,
        handleSubmit,
        isDataSubmitting
    } = props

    const isMobile = useMediaQuery(`(max-width: ${em(768)})`)
    const { mutate: rotateTrafficAuditCredential, isPending: isRotatingCredential } =
        useRotateTrafficAuditCredential({
            mutationFns: {
                onSuccess: (result) => {
                    const compose = `services:
  remnanode:
    container_name: remnanode
    hostname: remnanode
    image: ghcr.io/moroz-374/remnawave-node:stable
    network_mode: host
    restart: always
    cap_add:
      - NET_ADMIN
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
    healthcheck:
      test:
        - CMD-SHELL
        - >-
          node -e "const net=require('net');const socket=net.connect({host:'127.0.0.1',port:Number(process.env.NODE_PORT)},()=>{socket.destroy();process.exit(0)});socket.setTimeout(2000);socket.on('timeout',()=>socket.destroy(new Error('timeout')));socket.on('error',()=>process.exit(1))"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    environment:
      - NODE_PORT=${node.port ?? 2222}
      - SECRET_KEY="${pubKey?.pubKey.trimEnd() ?? ''}"
      - TRAFFIC_AUDIT_BACKEND_URL="${window.location.origin}"
      - TRAFFIC_AUDIT_CREDENTIAL="${result.trafficAuditCredential}"
      - TRAFFIC_AUDIT_FLUSH_INTERVAL_MS=5000
      - TRAFFIC_AUDIT_QUEUE_MAX_SIZE=20000
      - TRAFFIC_AUDIT_REQUEST_TIMEOUT_MS=10000
      - TRAFFIC_AUDIT_BACKOFF_INITIAL_MS=1000
      - TRAFFIC_AUDIT_BACKOFF_MAX_MS=60000`

                    modals.open({
                        title: t('base-node-form.traffic-audit-credential-title'),
                        size: 'lg',
                        children: (
                            <Stack>
                                <Alert color="orange">
                                    {t('base-node-form.traffic-audit-credential-once')}
                                </Alert>
                                <Text size="sm">
                                    {t('base-node-form.traffic-audit-compose-instructions')}
                                </Text>
                                <CopyableCodeBlock value={compose} />
                            </Stack>
                        )
                    })
                }
            }
        })

    const handleRotateTrafficAuditCredential = () => {
        modals.openConfirmModal({
            title: t('base-node-form.traffic-audit-credential-title'),
            children: <Text size="sm">{t('base-node-form.traffic-audit-credential-confirm')}</Text>,
            labels: { confirm: t('common.confirm-action'), cancel: t('common.cancel') },
            confirmProps: { color: 'orange' },
            onConfirm: () => rotateTrafficAuditCredential({ route: { uuid: node.uuid } })
        })
    }

    return (
        <>
            {isMobile ? (
                <MotionStack
                    animate="visible"
                    gap="lg"
                    initial="hidden"
                    variants={containerVariants}
                >
                    <ModalAccordionWidget node={node} />

                    {nodeDetailsCard && (
                        <MotionWrapper variants={cardVariants}>{nodeDetailsCard}</MotionWrapper>
                    )}

                    {nodeSystemCard && node.system && (
                        <MotionWrapper variants={cardVariants}>{nodeSystemCard}</MotionWrapper>
                    )}

                    <NodeVitalsCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                        nodePlugins={nodePlugins}
                        pubKey={pubKey}
                    />

                    <NodeConfigProfilesCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />

                    <NodeTrackingAndBillingCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />

                    <NodeConsumptionCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />
                </MotionStack>
            ) : (
                <Group align="flex-start" gap="md" grow={false} wrap="wrap">
                    {/* Left Side */}
                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 400px' }}
                        variants={containerVariants}
                    >
                        <ModalAccordionWidget node={node} />

                        {nodeDetailsCard && (
                            <MotionWrapper variants={cardVariants}>{nodeDetailsCard}</MotionWrapper>
                        )}

                        <NodeVitalsCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                            nodePlugins={nodePlugins}
                            pubKey={pubKey}
                        />

                        <NodeConsumptionCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                    </MotionStack>

                    {/* Right Side */}
                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 400px' }}
                        variants={containerVariants}
                    >
                        {nodeSystemCard && node.system && (
                            <MotionWrapper variants={cardVariants}>{nodeSystemCard}</MotionWrapper>
                        )}

                        <NodeConfigProfilesCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />

                        <NodeTrackingAndBillingCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                    </MotionStack>
                </Group>
            )}

            <ModalFooter isMobile={isMobile}>
                {node && (
                    <Menu keepMounted={true} position="top-end" shadow="md">
                        <Menu.Target>
                            <Button
                                color="gray"
                                leftSection={<TbDots size={px('1.2rem')} />}
                                size="md"
                            >
                                {t('base-node-form.more-actions')}
                            </Button>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <DeleteNodeFeature handleClose={handleClose} node={node} />
                            <Menu.Divider />

                            <Menu.Label>{t('base-node-form.management')}</Menu.Label>
                            <CopyButton value={node.uuid}>
                                {({ copy }) => (
                                    <Menu.Item leftSection={<TbCopy size="16px" />} onClick={copy}>
                                        {t('common.copy-uuid')}
                                    </Menu.Item>
                                )}
                            </CopyButton>
                            <ResetNodeTrafficFeature handleClose={handleClose} node={node} />

                            <Menu.Item
                                color={node.isTrafficAuditConfigured ? undefined : 'orange'}
                                disabled={isRotatingCredential}
                                leftSection={<TbKey size="16px" />}
                                onClick={handleRotateTrafficAuditCredential}
                            >
                                {node.isTrafficAuditConfigured
                                    ? t('base-node-form.rotate-traffic-audit-credential')
                                    : t('base-node-form.configure-traffic-audit')}
                            </Menu.Item>

                            <RestartNodeButtonFeature handleClose={handleClose} node={node} />
                            <ToggleNodeStatusButtonFeature handleClose={handleClose} node={node} />
                        </Menu.Dropdown>
                    </Menu>
                )}
                <Button
                    color="teal"
                    disabled={!form.isDirty() || !form.isTouched()}
                    leftSection={<PiFloppyDiskDuotone size="16px" />}
                    loading={isDataSubmitting}
                    onClick={handleSubmit}
                    size="md"
                    variant="light"
                >
                    {t('common.save')}
                </Button>
            </ModalFooter>
        </>
    )
}
