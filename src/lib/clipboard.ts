import { useToastStore } from '@/stores/toast'

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    useToastStore.getState().show('Copied to clipboard', 'info')
  } catch {
    useToastStore.getState().show('Failed to copy to clipboard', 'error')
  }
}
