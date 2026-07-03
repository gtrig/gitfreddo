import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/Ui/Modal'
import { DocsSidebar } from '@/components/Help/DocsSidebar'
import { MarkdownView } from '@/components/Help/MarkdownView'
import { getDocContent } from '@/lib/docs/content'
import { DEFAULT_DOC_PATH, isKnownDocPath, loadDocPath, saveDocPath } from '@/lib/docs/catalog'

interface DocsModalProps {
  open: boolean
  onClose: () => void
  initialPath?: string
}

export function DocsModal({ open, onClose, initialPath }: DocsModalProps) {
  const { t } = useTranslation()
  const [activePath, setActivePath] = useState(() => loadDocPath())

  useEffect(() => {
    if (!open) return
    const nextPath =
      initialPath && isKnownDocPath(initialPath) ? initialPath : loadDocPath()
    setActivePath(nextPath)
  }, [open, initialPath])

  function selectPath(path: string) {
    setActivePath(path)
    saveDocPath(path)
  }

  const content = getDocContent(activePath)

  return (
    <Modal title={t('docs.title')} open={open} onClose={onClose} size="xl">
      <div className="flex max-h-[min(75vh,40rem)] min-h-[320px] gap-4">
        <DocsSidebar activePath={activePath} onSelect={selectPath} />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
          {content ? (
            <MarkdownView content={content} currentPath={activePath} onNavigate={selectPath} />
          ) : (
            <p className="text-sm text-gf-fg-subtle">
              {t('docs.pageNotFound', { path: activePath || DEFAULT_DOC_PATH })}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
