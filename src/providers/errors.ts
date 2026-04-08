/**
 * Core provider runtime errors.
 *
 * Actionable-only messages: every error tells the user exactly what to
 * change to recover. No deprecation history, no rationale.
 */

import { Data } from 'effect'
import type { Capability, ProviderId } from './runtime.js'

export class CapabilityNotSupported extends Data.TaggedError(
  'CapabilityNotSupported',
)<{
  readonly provider: ProviderId
  readonly capability: Capability
  readonly supportedAlternatives: readonly ProviderId[]
}> {
  get message(): string {
    const alternatives =
      this.supportedAlternatives.length > 0
        ? ` Use one of: ${this.supportedAlternatives.join(', ')}.`
        : ''
    return `${this.provider} does not support ${this.capability}.${alternatives}`
  }
}

export class MissingApiKey extends Data.TaggedError('MissingApiKey')<{
  readonly provider: ProviderId
  readonly envVar: string
}> {
  get message(): string {
    return `${this.provider} requires ${this.envVar}. Set ${this.envVar} in your environment.`
  }
}

export class ProviderNotFound extends Data.TaggedError('ProviderNotFound')<{
  readonly id: string
  readonly known: readonly ProviderId[]
}> {
  get message(): string {
    const knownList =
      this.known.length > 0 ? this.known.join(', ') : '(none registered)'
    return `Provider "${this.id}" is not registered. Known providers: ${knownList}.`
  }
}
