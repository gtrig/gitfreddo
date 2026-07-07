import type { BranchCheckoutParams } from '@shared/git'

export function localBranchCheckoutParams(name: string): BranchCheckoutParams {
  return { name }
}

/** Checkout a commit or tag in detached HEAD (`git switch --detach <ref>`). */
export function detachedRefCheckoutParams(ref: string): BranchCheckoutParams {
  return { name: ref, detach: true }
}
