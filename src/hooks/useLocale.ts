import { useEffect } from 'react'
import i18n from '@/i18n'
import { useAppSettings } from '@/hooks/useAppSettings'

export function useLocale() {
  const { data: settings } = useAppSettings()

  useEffect(() => {
    const locale = settings?.locale ?? 'en'
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale)
    }
  }, [settings?.locale])
}
