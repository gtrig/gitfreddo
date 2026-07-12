import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitHubMarkdownBody } from '@/components/Ui/GitHubMarkdownBody'
import { previewCommitDescription } from '@/lib/format/textPreview'

export function CommitDescriptionPreview({ text }: { text: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { preview, truncated } = useMemo(() => previewCommitDescription(text), [text])
  const content = !truncated || expanded ? text : `${preview}…`

  if (!truncated) {
    return <GitHubMarkdownBody content={text} className="mt-1.5 text-gf-fg-subtle" />
  }

  return (
    <div className="mt-1.5">
      <GitHubMarkdownBody content={content} className="text-gf-fg-subtle" />
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
