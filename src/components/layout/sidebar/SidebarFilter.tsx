import { useEffect, useRef } from 'react'
import { SidebarIconSearch } from '@/components/layout/sidebar/SidebarIcons'

interface SidebarFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SidebarFilter({
  value,
  onChange,
  placeholder = 'Filter (Ctrl + Alt + F)'
}: SidebarFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="relative pb-2">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gf-border bg-gf-bg py-1.5 pl-2.5 pr-8 text-xs text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-border-strong focus:outline-none"
      />
      <SidebarIconSearch className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gf-fg-subtle" />
    </div>
  )
}
