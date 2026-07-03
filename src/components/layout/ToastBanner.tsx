import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import { TOAST_AUTO_DISMISS_MS, useToastStore } from '@/stores/toast'

const TONE_CONFIG = {
  success: {
    Icon: CheckCircleIcon,
    iconClass: 'text-emerald-400',
    accentClass: 'border-l-emerald-500'
  },
  error: {
    Icon: ExclamationCircleIcon,
    iconClass: 'text-red-400',
    accentClass: 'border-l-red-500'
  },
  info: {
    Icon: InformationCircleIcon,
    iconClass: 'text-gf-accent-fg',
    accentClass: 'border-l-gf-accent'
  }
} as const

export function ToastBanner() {
  const { t } = useTranslation()
  const message = useToastStore((s) => s.message)
  const tone = useToastStore((s) => s.tone)
  const clear = useToastStore((s) => s.clear)
  const [progressKey, setProgressKey] = useState(0)

  useEffect(() => {
    if (message) {
      setProgressKey((key) => key + 1)
    }
  }, [message])

  if (!message) {
    return null
  }

  const { Icon, iconClass, accentClass } = TONE_CONFIG[tone]

  return (
    <div
      className="pointer-events-none fixed top-14 right-4 z-50 w-full max-w-sm px-4 sm:px-0"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto overflow-hidden rounded-lg border border-gf-border border-l-4 bg-gf-surface shadow-2xl ${accentClass} gf-toast-enter`}
      >
        <div className="flex items-start gap-3 px-3 py-2.5">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-snug text-gf-fg">{message}</p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded p-0.5 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg"
            aria-label={t('common.dismiss')}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="h-0.5 bg-gf-border">
          <div
            key={progressKey}
            className="gf-toast-progress h-full origin-left bg-gf-fg-subtle/40"
            style={{ animationDuration: `${TOAST_AUTO_DISMISS_MS}ms` }}
          />
        </div>
      </div>
    </div>
  )
}
