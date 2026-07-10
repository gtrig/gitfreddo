import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { previewCommitDescription } from '@/lib/format/textPreview'

export function CommitDescriptionPreview({ text }: { text: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { preview, truncated } = useMemo(() => previewCommitDescription(text), [text])

  if (!truncated) {
    return (
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gf-fg-subtle">{text}</p>
    )
  }

  return (
    <div className="mt-1.5">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gf-fg-subtle">
        {expanded ? text : `${preview}…`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-1 text-xs text-gf-accent-fg hover:text-gf-fg"
      >
        {expanded ? t('detail.showLess') : t('detail.showMore')}
      </button>
    </div>
  )
}
