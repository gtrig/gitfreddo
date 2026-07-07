import { defineCommand } from './_types'
import { endOfOptionsArg } from './_common'

export interface SwitchCheckoutParams {
  name: string
  detach: boolean
}

export function buildSwitchCheckoutArgs({ name, detach }: SwitchCheckoutParams): string[] {
  return detach
    ? ['switch', '--detach', ...endOfOptionsArg(name)]
    : ['switch', ...endOfOptionsArg(name)]
}

export interface SwitchCreateTrackingParams {
  local: string
  trackingRef: string
}

export function buildSwitchCreateTrackingArgs({ local, trackingRef }: SwitchCreateTrackingParams): string[] {
  return ['switch', '-c', local, '--track', trackingRef]
}

export const switchCheckout = defineCommand({
  id: 'switch.checkout',
  subcommand: 'switch',
  buildArgs: buildSwitchCheckoutArgs
})

export const switchCreateTracking = defineCommand({
  id: 'switch.create-tracking',
  subcommand: 'switch',
  buildArgs: buildSwitchCreateTrackingArgs
})

/** @deprecated Use `buildSwitchCheckoutArgs({ name, detach })` */
export function buildBranchSwitchArgs(name: string, detach: boolean): string[] {
  return buildSwitchCheckoutArgs({ name, detach })
}
