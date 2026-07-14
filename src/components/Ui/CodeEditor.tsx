import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import type { CodeLanguage } from '@/lib/editor/detectLanguage'

export interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: CodeLanguage
  readOnly?: boolean
  className?: string
  minHeight?: string
  rows?: number
  'aria-label'?: string
}

function languageExtension(language: CodeLanguage) {
  switch (language) {
    case 'javascript':
      return javascript({ typescript: true, jsx: true })
    case 'json':
      return json()
    case 'html':
      return html()
    case 'css':
      return css()
    case 'python':
      return python()
    case 'markdown':
      return markdown()
    case 'xml':
      return xml()
    case 'shell':
      return StreamLanguage.define(shell)
    case 'plaintext':
    default:
      return []
  }
}

const gitFreddoTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--gf-fg)',
      backgroundColor: 'var(--gf-bg-deep)',
      fontSize: '12px',
      border: '1px solid var(--gf-border-strong)',
      borderRadius: '0.25rem'
    },
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      caretColor: 'var(--gf-fg)',
      padding: '8px 0'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--gf-fg)'
    },
    '&.cm-focused': {
      outline: 'none',
      borderColor: 'var(--gf-accent)'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--gf-accent) 35%, transparent)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--gf-bg-deep)',
      color: 'var(--gf-fg-subtle)',
      borderRight: '1px solid var(--gf-border-strong)',
      borderTopLeftRadius: '0.25rem',
      borderBottomLeftRadius: '0.25rem'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, var(--gf-accent) 12%, transparent)'
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--gf-accent) 8%, transparent)'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    }
  },
  { dark: true }
)

function rowsToMinHeight(rows: number | undefined, minHeight: string | undefined): string {
  if (minHeight) return minHeight
  if (rows !== undefined) return `${Math.max(rows, 1) * 1.25 + 1}rem`
  return '10rem'
}

export function CodeEditor({
  value,
  onChange,
  language = 'plaintext',
  readOnly = false,
  className,
  minHeight,
  rows,
  'aria-label': ariaLabel
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  onChangeRef.current = onChange
  valueRef.current = value

  useEffect(() => {
    if (!hostRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        languageExtension(language),
        gitFreddoTheme,
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({
          'aria-label': ariaLabel ?? 'Code editor'
        }),
        updateListener,
        EditorView.theme({
          '&': { minHeight: rowsToMinHeight(rows, minHeight) },
          '.cm-scroller': { minHeight: rowsToMinHeight(rows, minHeight) }
        })
      ]
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, readOnly, minHeight, rows, ariaLabel])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value }
    })
  }, [value])

  return <div ref={hostRef} className={className} data-testid="code-editor" />
}
