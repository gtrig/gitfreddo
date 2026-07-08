import { useTranslation } from 'react-i18next'

const ROW_GRID = 'grid-cols-[44px_minmax(0,1fr)]'

export function FullFileView({
  content,
  loading
}: {
  content: string
  loading?: boolean
}) {
  const { t } = useTranslation()

  if (loading) {
    return <p className="text-sm text-gf-fg-subtle">{t('diff.loadingFile')}</p>
  }

  const lines = content.split('\n')

  return (
    <div className="font-mono text-[12px] leading-5">
      {lines.map((text, index) => {
        const lineNo = index + 1
        return (
          <div key={lineNo} className={`grid ${ROW_GRID} text-gf-fg-muted`}>
            <span className="select-none border-r border-gf-border/50 px-2 text-right text-gf-fg-subtle">
              {lineNo}
            </span>
            <span className="whitespace-pre px-2">{text || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}
