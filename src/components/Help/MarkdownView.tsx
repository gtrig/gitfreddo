import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveDocLink } from '@/lib/docs/resolve'

interface MarkdownViewProps {
  content: string
  currentPath: string
  onNavigate: (path: string) => void
}

function DocLink({
  href,
  children,
  currentPath,
  onNavigate
}: {
  href?: string
  children: ReactNode
  currentPath: string
  onNavigate: (path: string) => void
}) {
  if (!href) {
    return <span>{children}</span>
  }

  const internalPath = resolveDocLink(currentPath, href)
  if (internalPath) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(internalPath)}
        className="text-gf-accent underline decoration-gf-accent/40 underline-offset-2 hover:decoration-gf-accent"
      >
        {children}
      </button>
    )
  }

  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-gf-accent underline decoration-gf-accent/40 underline-offset-2 hover:decoration-gf-accent"
      >
        {children}
      </a>
    )
  }

  return <span className="text-gf-fg-muted">{children}</span>
}

export function MarkdownView({ content, currentPath, onNavigate }: MarkdownViewProps) {
  return (
    <article className="docs-markdown text-sm leading-relaxed text-gf-fg-muted">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 text-xl font-semibold text-gf-fg">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-base font-semibold text-gf-fg">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-semibold text-gf-fg">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-gf-border-strong pl-3 text-gf-fg-subtle">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-gf-border" />,
          code: ({ className, children }) => {
            const isBlock = Boolean(className)
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded border border-gf-border bg-gf-bg-deep p-3 font-mono text-xs text-gf-fg">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-gf-bg-deep px-1 py-0.5 font-mono text-xs text-gf-fg">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-3">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-gf-border-strong">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gf-border">{children}</tr>,
          th: ({ children }) => (
            <th className="px-2 py-1.5 font-medium text-gf-fg">{children}</th>
          ),
          td: ({ children }) => <td className="px-2 py-1.5">{children}</td>,
          a: ({ href, children }) => (
            <DocLink href={href} currentPath={currentPath} onNavigate={onNavigate}>
              {children}
            </DocLink>
          ),
          strong: ({ children }) => <strong className="font-semibold text-gf-fg">{children}</strong>
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
