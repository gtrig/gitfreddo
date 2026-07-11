import { brandLogoUrl } from '@/lib/brand/brandLogoUrl'

export function AppBrandRail() {
  return (
    <aside
      className="flex w-30 shrink-0 items-center justify-center self-stretch border-r border-gf-border bg-gf-bg-deep px-3 py-2"
      aria-label="GitFreddo"
    >
      <img
        src={brandLogoUrl(import.meta.env.BASE_URL)}
        alt="GitFreddo"
        className="h-18 w-auto object-contain"
      />
    </aside>
  )
}
