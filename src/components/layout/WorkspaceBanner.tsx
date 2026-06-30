interface WorkspaceBannerProps {
  onReconnect: () => Promise<void>
}

export function WorkspaceBanner({ onReconnect }: WorkspaceBannerProps) {
  const processExited = false
  if (!processExited) return null

  return (
    <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
      <span>Repository connection lost.</span>
      <button
        type="button"
        onClick={() => void onReconnect()}
        className="rounded border border-amber-400/40 px-2 py-0.5 text-xs hover:bg-amber-500/20"
      >
        Reconnect
      </button>
    </div>
  )
}
