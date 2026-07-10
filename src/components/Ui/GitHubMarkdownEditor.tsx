import { useRef, useState, type TextareaHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChatBubbleBottomCenterTextIcon,
  CodeBracketIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon
} from '@heroicons/react/24/outline'
import { GitHubMarkdownBody } from '@/components/Ui/GitHubMarkdownBody'
import { TextArea } from '@/components/Ui/Modal'
import {
  applyGitHubMarkdownAction,
  type GitHubMarkdownAction
} from '@/lib/markdown/githubMarkdown'

type EditorTab = 'write' | 'preview'

interface GitHubMarkdownEditorProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  compact?: boolean
}

function ToolbarButton({
  label,
  title,
  onClick,
  children
}: {
  label: string
  title: string
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={onClick}
      className="rounded px-1.5 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface-hover hover:text-gf-fg"
    >
      {children ?? label}
    </button>
  )
}

export function GitHubMarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled = false,
  compact = false,
  id,
  className = ''
}: GitHubMarkdownEditorProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<EditorTab>('write')

  function applyAction(action: GitHubMarkdownAction) {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const result = applyGitHubMarkdownAction(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      action
    )
    onChange(result.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return (
    <div
      className={`overflow-hidden rounded-md border border-gf-border-strong bg-gf-bg-deep ${className}`}
    >
      <div className="flex items-center justify-between border-b border-gf-border bg-gf-surface/40 px-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`border-b-2 px-2 py-2 text-xs font-medium ${
              tab === 'write'
                ? 'border-gf-accent text-gf-fg'
                : 'border-transparent text-gf-fg-subtle hover:text-gf-fg-muted'
            }`}
          >
            {t('markdown.write')}
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`border-b-2 px-2 py-2 text-xs font-medium ${
              tab === 'preview'
                ? 'border-gf-accent text-gf-fg'
                : 'border-transparent text-gf-fg-subtle hover:text-gf-fg-muted'
            }`}
          >
            {t('markdown.preview')}
          </button>
        </div>
        <p className="px-2 text-[10px] text-gf-fg-subtle">{t('markdown.supported')}</p>
      </div>

      {tab === 'write' ? (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border-b border-gf-border px-1 py-1">
            <ToolbarButton
              label={t('markdown.bold')}
              title={t('markdown.bold')}
              onClick={() => applyAction('bold')}
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.italic')}
              title={t('markdown.italic')}
              onClick={() => applyAction('italic')}
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.strikethrough')}
              title={t('markdown.strikethrough')}
              onClick={() => applyAction('strikethrough')}
            >
              <span className="line-through">S</span>
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.link')}
              title={t('markdown.link')}
              onClick={() => applyAction('link')}
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.quote')}
              title={t('markdown.quote')}
              onClick={() => applyAction('quote')}
            >
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.code')}
              title={t('markdown.code')}
              onClick={() => applyAction('code')}
            >
              <CodeBracketIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.codeBlock')}
              title={t('markdown.codeBlock')}
              onClick={() => applyAction('code-block')}
            >
              {'{ }'}
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.bulletList')}
              title={t('markdown.bulletList')}
              onClick={() => applyAction('bullet-list')}
            >
              <ListBulletIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.numberedList')}
              title={t('markdown.numberedList')}
              onClick={() => applyAction('numbered-list')}
            >
              <NumberedListIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t('markdown.taskList')}
              title={t('markdown.taskList')}
              onClick={() => applyAction('task-list')}
            >
              ☑
            </ToolbarButton>
          </div>
          <TextArea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            rows={compact ? Math.min(rows, 4) : rows}
            disabled={disabled}
            className="min-h-[120px] resize-y rounded-none border-0 bg-transparent focus:border-transparent"
          />
        </>
      ) : (
        <div className={`${compact ? 'min-h-[120px]' : 'min-h-[160px]'} overflow-auto p-3`}>
          {value.trim() ? (
            <GitHubMarkdownBody content={value} />
          ) : (
            <p className="text-sm text-gf-fg-subtle">{t('markdown.nothingToPreview')}</p>
          )}
        </div>
      )}
    </div>
  )
}
