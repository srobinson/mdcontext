import { Effect } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { createOpenAIProvider } from './openai-provider.js'

describe('OpenAIProvider', () => {
  it('splits large embedding requests by token budget', async () => {
    const provider = await Effect.runPromise(
      createOpenAIProvider({
        apiKey: 'test-key',
        batchSize: 100,
      }),
    )

    const createMock = vi
      .fn()
      .mockImplementation(async ({ input }: { input: string[] }) => ({
        data: input.map((_text, index) => ({
          embedding: [index + 1, index + 2],
        })),
        usage: {
          total_tokens: input.length * 10,
        },
      }))

    ;(
      provider as unknown as {
        client: {
          embeddings: {
            create: typeof createMock
          }
        }
      }
    ).client.embeddings.create = createMock

    const largeText = 'a'.repeat(300_000)
    const progress: Array<{
      batchIndex: number
      totalBatches: number
      processedTexts: number
      totalTexts: number
    }> = []

    const result = await provider.embed(
      [largeText, largeText, largeText, largeText],
      {
        onBatchProgress: (update) => progress.push(update),
      },
    )

    expect(createMock).toHaveBeenCalledTimes(2)
    expect(createMock.mock.calls[0]?.[0].input).toHaveLength(2)
    expect(createMock.mock.calls[1]?.[0].input).toHaveLength(2)
    expect(progress).toEqual([
      {
        batchIndex: 1,
        totalBatches: 2,
        processedTexts: 2,
        totalTexts: 4,
      },
      {
        batchIndex: 2,
        totalBatches: 2,
        processedTexts: 4,
        totalTexts: 4,
      },
    ])
    expect(result.embeddings).toHaveLength(4)
    expect(result.tokensUsed).toBe(40)
  })
})
