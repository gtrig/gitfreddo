import type { SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarIconOrigin } from '@/components/Layout/sidebar/SidebarIcons'
import type { TimelineRemoteProvider } from '@/lib/timeline/timelineRefLocation'

type IconProps = SVGProps<SVGSVGElement>

export function ForgeIconGitHub(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  )
}

export function ForgeIconGitLab(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <path d="M15.918 6.05.082 6.05 0 6.28l7.918 9.52L16 6.28zm-1.07-.37L13.07.78a.51.51 0 0 0-.97 0L10.48 5.68h4.37zm-10.9 0h4.37L6.3.78a.51.51 0 0 0-.97 0L3.68 5.68zm5.1 7.09L1.5 5.68h4.1zm1.32 0 4.1-7.09h4.1z" />
    </svg>
  )
}

export function ForgeIconBitbucket(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <path d="M1.5 1.5a.66.66 0 0 0-.65.76l2.05 12.48c.07.42.43.73.85.73h8.72c.3 0 .56-.2.64-.49l2.04-12.5a.66.66 0 0 0-.65-.76zm8.6 9.07H5.93l-.7-3.7h5.54z" />
    </svg>
  )
}

const FORGE_TITLE: Record<Exclude<TimelineRemoteProvider, 'unknown'>, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket'
}

export function TimelineRemoteProviderIcon({
  provider,
  className
}: {
  provider: TimelineRemoteProvider
  className?: string
}) {
  const { t } = useTranslation()
  const title = provider === 'unknown' ? t('sidebar.remote') : FORGE_TITLE[provider]
  const iconClass = className ?? 'h-2.5 w-2.5 shrink-0 opacity-90'

  switch (provider) {
    case 'github':
      return (
        <span className="inline-flex shrink-0" title={title}>
          <ForgeIconGitHub className={iconClass} />
        </span>
      )
    case 'gitlab':
      return (
        <span className="inline-flex shrink-0" title={title}>
          <ForgeIconGitLab className={iconClass} />
        </span>
      )
    case 'bitbucket':
      return (
        <span className="inline-flex shrink-0" title={title}>
          <ForgeIconBitbucket className={iconClass} />
        </span>
      )
    default:
      return (
        <span className="inline-flex shrink-0" title={title}>
          <SidebarIconOrigin className={iconClass} />
        </span>
      )
  }
}
