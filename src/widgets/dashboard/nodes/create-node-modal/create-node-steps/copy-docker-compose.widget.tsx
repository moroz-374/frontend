import { Button, CopyButton, Group, Skeleton } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { SiDocker } from 'react-icons/si'
import { PiCheck } from 'react-icons/pi'

import { useGetPubKey } from '@shared/api/hooks'

interface IProps {
    port?: number
}

export const CopyDockerComposeWidget = ({ port }: IProps) => {
    const { data: pubKey, isLoading: isPubKeyLoading } = useGetPubKey()
    const { t } = useTranslation()

    if (isPubKeyLoading || !pubKey) {
        return <Skeleton height={40} />
    }

    const generateDockerCompose = (port?: number) => {
        return `services:
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
      - NODE_PORT=${port ?? 2222}
      - SECRET_KEY=${pubKey.pubKey.trimEnd()}
      - TRAFFIC_AUDIT_BACKEND_URL=${window.location.origin}
      - TRAFFIC_AUDIT_CREDENTIAL=${pubKey.trafficAuditCredential}
      - TRAFFIC_AUDIT_FLUSH_INTERVAL_MS=5000
      - TRAFFIC_AUDIT_QUEUE_MAX_SIZE=20000
      - TRAFFIC_AUDIT_REQUEST_TIMEOUT_MS=10000
      - TRAFFIC_AUDIT_BACKOFF_INITIAL_MS=1000
      - TRAFFIC_AUDIT_BACKOFF_MAX_MS=60000`
    }

    return (
        <Group mt="lg">
            <CopyButton timeout={2000} value={generateDockerCompose(port)}>
                {({ copied, copy }) => (
                    <Button
                        color={copied ? 'teal' : 'gray'}
                        fullWidth
                        leftSection={copied ? <PiCheck size={18} /> : <SiDocker size={18} />}
                        onClick={copy}
                        size="md"
                    >
                        {t('copy-docker-compose.widget.copy-docker-compose-yml')}
                    </Button>
                )}
            </CopyButton>
        </Group>
    )
}
