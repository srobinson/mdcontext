/**
 * Type declarations for wink-bm25-text-search
 */

declare module 'wink-bm25-text-search' {
  interface BM25Config {
    fldWeights?: Record<string, number>
    bm25Params?: {
      k1?: number
      b?: number
    }
    ovFldNames?: string[]
  }

  type PrepTask = (text: string) => string[]

  interface BM25Engine {
    defineConfig(config: BM25Config): void
    definePrepTasks(tasks: PrepTask[]): void
    addDoc(doc: Record<string, string>, id: number): void
    consolidate(): void
    search(query: string, limit?: number): [number, number][]
    exportJSON(): string
    importJSON(json: string): void
    reset(): void
  }

  function bm25(): BM25Engine
  export default bm25
}
