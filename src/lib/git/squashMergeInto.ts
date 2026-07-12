export function buildSquashMergeIntoMessage(sourceBranch: string): string {
  return `Squashed commit from branch '${sourceBranch}'`
}
