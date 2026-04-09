/**
 * Legacy @effect/cli error formatting.
 *
 * These helpers handle the transitional pattern where `@effect/cli`
 * validation errors are caught at the top level in `main.ts` and
 * rendered with mode-suggestion enhancement. They are intentionally
 * kept out of `error-handler.ts` so the central error module stays
 * focused on the `MdmError` family.
 */

/**
 * Check if an error is an Effect CLI validation error.
 * Used during transition to catch @effect/cli errors.
 */
export const isEffectCliValidationError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    return (
      err._tag === 'ValidationError' ||
      err._tag === 'MissingValue' ||
      err._tag === 'InvalidValue' ||
      err._tag === 'CommandDirective'
    )
  }
  return false
}

/**
 * Extract the error message from an Effect CLI error structure.
 */
const extractEffectCliMessage = (error: unknown): string | null => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (err._tag === 'Paragraph' && err.value) {
      const paragraph = err.value as Record<string, unknown>
      if (paragraph._tag === 'Text' && typeof paragraph.value === 'string') {
        return paragraph.value
      }
    }
  }
  return null
}

/**
 * Extract user's invalid input from CLI arguments.
 * Looks for --mode value in process.argv.
 */
const extractModeValue = (): string | null => {
  const args = process.argv
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--mode' || arg === '-m') {
      return args[i + 1] ?? null
    }
    if (arg?.startsWith('--mode=')) {
      return arg.slice('--mode='.length) || null
    }
  }
  return null
}

/**
 * Suggest a correction for mode flag using Levenshtein distance.
 */
const suggestModeCorrection = (invalidMode: string): string | null => {
  const validModes = ['hybrid', 'semantic', 'keyword']

  const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= a.length; i++) matrix[i] = [i]
    for (let j = 0; j <= b.length; j++) matrix[0]![j] = j

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost,
        )
      }
    }
    return matrix[a.length]![b.length]!
  }

  let bestMatch: string | null = null
  let bestDistance = Infinity
  const maxDistance = 2

  for (const mode of validModes) {
    const distance = levenshtein(invalidMode.toLowerCase(), mode)
    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance
      bestMatch = mode
    }
  }

  return bestMatch
}

/**
 * Check if error is a mode validation error and enhance message with suggestion.
 */
const enhanceModeError = (baseMessage: string): string => {
  const modeValue = extractModeValue()
  if (!modeValue) return baseMessage

  const suggestion = suggestModeCorrection(modeValue)
  if (!suggestion) return baseMessage

  return `${baseMessage}\n\nDid you mean '--mode ${suggestion}'?`
}

/**
 * Format an Effect CLI validation error for display.
 */
export const formatEffectCliError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>

    if (
      (err._tag === 'ValidationError' ||
        err._tag === 'MissingValue' ||
        err._tag === 'InvalidValue') &&
      err.error
    ) {
      const message = extractEffectCliMessage(err.error)
      if (message) {
        return enhanceModeError(message)
      }
    }
  }
  return String(error)
}
