import { ActionIcon, Button, Group, Select, Stack, TextInput } from '@mantine/core'
import { TbEyeOff, TbPlus, TbTrash } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

import { useUpdateRemnawaveSettings } from '@shared/api/hooks/remnawave-settings/remnawave-settings.mutation.hooks'
import { TrafficAuditSettings } from '@shared/api/hooks/remnawave-settings/traffic-audit-settings.schema'
import { remnawaveSettingsQueryKeys } from '@shared/api/hooks/remnawave-settings/remnawave-settings.query.hooks'
import { SettingsCardShared } from '@shared/ui/settings-card'
import { queryClient } from '@shared/api'

interface IProps {
    trafficAuditSettings: TrafficAuditSettings
}

export const TrafficAuditSettingsCardWidget = ({ trafficAuditSettings }: IProps) => {
    const { t } = useTranslation()
    const [rules, setRules] = useState(trafficAuditSettings.hideRules)

    const { mutate: updateSettings, isPending } = useUpdateRemnawaveSettings({
        mutationFns: {
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: remnawaveSettingsQueryKeys.getRemnawaveSettings.queryKey
                })
            }
        }
    })

    const addRule = () => setRules((current) => [...current, { type: 'EXACT', pattern: '' }])

    return (
        <SettingsCardShared.Container>
            <SettingsCardShared.Header
                description={t('traffic-audit-settings.description')}
                icon={<TbEyeOff size={22} />}
                iconColor="violet"
                iconVariant="light"
                title={t('traffic-audit-settings.title')}
            />

            <SettingsCardShared.Content>
                <Stack gap="sm">
                    {rules.map((rule, index) => (
                        <Group
                            align="flex-end"
                            gap="xs"
                            key={`${index}-${rule.type}`}
                            wrap="nowrap"
                        >
                            <Select
                                data={[
                                    { value: 'EXACT', label: t('traffic-audit-settings.exact') },
                                    { value: 'SUFFIX', label: t('traffic-audit-settings.suffix') },
                                    { value: 'GLOB', label: t('traffic-audit-settings.glob') }
                                ]}
                                label={t('traffic-audit-settings.rule-type')}
                                onChange={(value) => {
                                    if (!value) return
                                    setRules((current) =>
                                        current.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? {
                                                      ...item,
                                                      type: value as 'EXACT' | 'SUFFIX' | 'GLOB'
                                                  }
                                                : item
                                        )
                                    )
                                }}
                                value={rule.type}
                                w={130}
                            />
                            <TextInput
                                label={t('traffic-audit-settings.pattern')}
                                onChange={(event) =>
                                    setRules((current) =>
                                        current.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? { ...item, pattern: event.currentTarget.value }
                                                : item
                                        )
                                    )
                                }
                                placeholder={t('traffic-audit-settings.pattern-placeholder')}
                                value={rule.pattern}
                                w="100%"
                            />
                            <ActionIcon
                                aria-label={t('traffic-audit-settings.remove-rule')}
                                color="red"
                                onClick={() =>
                                    setRules((current) =>
                                        current.filter((_, itemIndex) => itemIndex !== index)
                                    )
                                }
                                size="lg"
                                variant="subtle"
                            >
                                <TbTrash size={18} />
                            </ActionIcon>
                        </Group>
                    ))}

                    <Button leftSection={<TbPlus size={18} />} onClick={addRule} variant="light">
                        {t('traffic-audit-settings.add-rule')}
                    </Button>
                </Stack>
            </SettingsCardShared.Content>

            <SettingsCardShared.Bottom>
                <Group justify="flex-end" mt="md">
                    <Button
                        disabled={rules.some((rule) => !rule.pattern.trim())}
                        loading={isPending}
                        onClick={() =>
                            updateSettings({
                                variables: { trafficAuditSettings: { hideRules: rules } }
                            })
                        }
                    >
                        {t('common.save')}
                    </Button>
                </Group>
            </SettingsCardShared.Bottom>
        </SettingsCardShared.Container>
    )
}
