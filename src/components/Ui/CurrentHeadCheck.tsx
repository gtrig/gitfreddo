import { CheckIcon } from '@heroicons/react/24/solid'

export function CurrentHeadCheck({ title = 'Current HEAD' }: { title?: string }) {
  return (
    <span className="flex shrink-0 items-center" title={title}>
      <CheckIcon aria-hidden className="h-3 w-3 text-emerald-400" />
    </span>
  )
}
