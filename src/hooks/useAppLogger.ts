import { useEffect } from 'react'
import { appLog } from '@/stores/logs'

export function useAppLogger(): void {
  useEffect(() => {
    appLog('info', 'GitFredo started')
  }, [])
}
