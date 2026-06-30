import { useEffect } from 'react'
import { applyTheme, normalizeTheme } from '@/lib/themes'
import { useAppSettings } from '@/hooks/useAppSettings'

export function useTheme(): void {
  const { data } = useAppSettings()

  useEffect(() => {
    applyTheme(normalizeTheme(data?.theme))
  }, [data?.theme])
}
