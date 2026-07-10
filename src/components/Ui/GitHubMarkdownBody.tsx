import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GitHubMarkdownBodyProps {
  content: string
  className?: string
}

function ExternalLink({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <span>{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gf-accent underline decoration-gf-accent/40 underline-offset-2 hover:decoration-gf-accent"
    >
      {children}
    </a>
  )
}

export function GitHubMarkdownBody({ content, className = '' }: GitHubMarkdownBodyProps) {
  if (!content.trim()) return null

  return (
    <div className={`github-markdown text-sm leading-relaxed text-gf-fg-muted ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 border-b border-gf-border pb-2 text-xl font-semibold text-gf-fg">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 border-b border-gf-border pb-1 text-lg font-semibold text-gf-fg">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold text-gf-fg">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-gf-border-strong pl-3 text-gf-fg-subtle last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-gf-border" />,
          code: ({ className: codeClassName, children }) => {
            const isBlock = Boolean(codeClassName)
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md border border-gf-border bg-gf-bg-deep p-3 font-mono text-xs text-gf-fg">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-gf-bg-deep px-1 py-0.5 font-mono text-[0.9em] text-gf-fg">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-3 overflow-x-auto last:mb-0">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
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
          a: ({ href, children }) => <ExternalLink href={href}>{children}</ExternalLink>,
          strong: ({ children }) => <strong className="font-semibold text-gf-fg">{children}</strong>,
          del: ({ children }) => <del className="text-gf-fg-subtle">{children}</del>,
          input: ({ checked, disabled }) => {
            if (disabled) {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 align-middle accent-gf-accent"
                />
              )
            }
            return null
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
