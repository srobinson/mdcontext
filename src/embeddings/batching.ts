import { countTokensApprox } from '../utils/tokens.js'

export interface TextBatch {
  readonly texts: readonly string[]
  readonly estimatedTokens: number
}

export interface BatchTextsOptions {
  readonly maxTextsPerBatch: number
  readonly maxTokensPerBatch: number
}

/**
 * Split texts into batches constrained by both item count and estimated tokens.
 *
 * Token counts use the project's conservative approximation so we stay below
 * provider request limits even without exact tokenizer round-trips.
 */
export const batchTexts = (
  texts: readonly string[],
  options: BatchTextsOptions,
): TextBatch[] => {
  const { maxTextsPerBatch, maxTokensPerBatch } = options

  if (maxTextsPerBatch < 1) {
    throw new Error('maxTextsPerBatch must be at least 1')
  }
  if (maxTokensPerBatch < 1) {
    throw new Error('maxTokensPerBatch must be at least 1')
  }

  const batches: TextBatch[] = []
  let currentTexts: string[] = []
  let currentTokens = 0

  const flush = () => {
    if (currentTexts.length === 0) return
    batches.push({
      texts: currentTexts,
      estimatedTokens: currentTokens,
    })
    currentTexts = []
    currentTokens = 0
  }

  for (const text of texts) {
    const estimatedTokens = Math.max(1, countTokensApprox(text))

    // If a single text alone exceeds the budget, keep it isolated so we avoid
    // combining it with anything else. The provider may still reject it, but we
    // won't trigger an avoidable batch overflow.
    if (estimatedTokens > maxTokensPerBatch) {
      flush()
      batches.push({
        texts: [text],
        estimatedTokens,
      })
      continue
    }

    const wouldExceedTextCount = currentTexts.length >= maxTextsPerBatch
    const wouldExceedTokenBudget =
      currentTokens > 0 && currentTokens + estimatedTokens > maxTokensPerBatch

    if (wouldExceedTextCount || wouldExceedTokenBudget) {
      flush()
    }

    currentTexts.push(text)
    currentTokens += estimatedTokens
  }

  flush()
  return batches
}
