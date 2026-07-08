import { CheckIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'

export function CurrentHeadCheck({ title }: { title?: string }) {
  const { t } = useTranslation()

  return (
    <span className="flex shrink-0 items-center" title={title ?? t('common.currentHead')}>
      <CheckIcon aria-hidden className="h-3 w-3 text-emerald-400" />
    </span>
  )
}
