# Bug Fix Plan: Vector Metadata Save Error

**Bug ID**: Critical Vector Store Metadata Serialization Failure
**Severity**: P0 - Critical (Blocks production use)
**Impact**: Cannot embed large corpora (>1500 docs) with any provider
**Location**: `src/embeddings/vector-store.ts:401`
**Validation**: ✅ 100% reproducible - All providers (OpenAI, OpenRouter, Ollama) fail identically on 1,558-doc agentic-flow corpus

---

## Problem Statement

The vector store saves metadata as JSON using `JSON.stringify()`, which has a ~512MB string limit in V8. For large corpora (>1500 docs), the metadata object serializes to >512MB, causing a crash after embeddings are successfully generated.

### Current Code
```typescript
// src/embeddings/vector-store.ts:401
yield* Effect.tryPromise({
  try: () =>
    fs.writeFile(this.getMetaPath(), JSON.stringify(meta, null, 2)),
  catch: (e) =>
    new VectorStoreError({
      operation: 'save',
      // ...
    })
})
```

### Evidence
- **mdcontext (120 docs, 3903 sections)**: 58MB metadata → Works ✅
- **agentic-flow (1561 docs, 52,714 sections)**: ~785MB metadata → Fails ❌
- **Calculation**: 14.9KB per section × 52,714 sections = 785MB

---

## Solution Options

### Option 1: Binary Format (RECOMMENDED)
**Effort**: 4-6 hours
**Impact**: Solves problem permanently, reduces file size

Replace JSON with MessagePack or CBOR:
```typescript
import * as msgpack from '@msgpack/msgpack';

// Save
const encoded = msgpack.encode(meta);
await fs.writeFile(this.getMetaPath(), encoded);

// Load
const buffer = await fs.readFile(this.getMetaPath());
const meta = msgpack.decode(buffer);
```

**Benefits**:
- No size limits
- 30-50% smaller files
- Faster I/O
- Backward compatible (can auto-migrate)

**Dependencies**:
```bash
npm install @msgpack/msgpack
```

---

### Option 2: Chunked JSON
**Effort**: 6-8 hours
**Impact**: Solves problem, maintains JSON format

Split metadata into chunks:
```typescript
const CHUNK_SIZE = 1000; // sections per file
const chunks = [];

for (let i = 0; i < meta.length; i += CHUNK_SIZE) {
  const chunk = meta.slice(i, i + CHUNK_SIZE);
  await fs.writeFile(
    `${this.getMetaPath()}.${i}.json`,
    JSON.stringify(chunk, null, 2)
  );
  chunks.push(i);
}

// Save index
await fs.writeFile(
  `${this.getMetaPath()}.index.json`,
  JSON.stringify({ chunks, chunkSize: CHUNK_SIZE })
);
```

**Benefits**:
- Maintains JSON format (easier debugging)
- Lazy loading possible
- Each chunk stays under limit

**Drawbacks**:
- Multiple files to manage
- More complex loading logic
- Slower than binary

---

### Option 3: Reduce Metadata (SHORT-TERM)
**Effort**: 2-3 hours
**Impact**: Delays problem, doesn't solve it

Audit what's stored per vector and remove redundancy:
```typescript
// Current (example)
{
  sectionId: "abc123",
  documentId: "doc456",
  path: "/path/to/file.md",
  title: "Section Title",
  content: "Full section content...",  // REMOVE THIS
  tokens: 150,
  hash: "sha256...",
  metadata: { ... }  // Audit this
}

// Optimized
{
  sectionId: "abc123",
  documentId: "doc456",
  // Remove content (already in sections.json)
  // Remove redundant metadata
}
```

**Benefits**:
- Quick to implement
- Reduces file size 5-10x

**Drawbacks**:
- Still hits limit on very large corpora
- Requires matching changes in load logic

---

### Option 4: SQLite Storage (LONG-TERM)
**Effort**: 16-20 hours
**Impact**: Best long-term solution

Replace JSON files with SQLite:
```typescript
import Database from 'better-sqlite3';

const db = new Database('.mdcontext/vectors.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS vector_meta (
    section_id TEXT PRIMARY KEY,
    document_id TEXT,
    data BLOB
  );
  CREATE INDEX idx_doc ON vector_meta(document_id);
`);

// Save
const stmt = db.prepare('INSERT INTO vector_meta VALUES (?, ?, ?)');
for (const item of meta) {
  stmt.run(item.sectionId, item.documentId, msgpack.encode(item));
}
```

**Benefits**:
- No size limits
- Built-in indexing
- ACID guarantees
- Standard format
- Query capabilities

**Drawbacks**:
- Major refactor
- Additional dependency
- Migration complexity

---

## Recommended Approach

### Phase 1: Immediate (4-6 hours)
**Implement Option 1: Binary Format (MessagePack)**

1. Add dependency: `@msgpack/msgpack`
2. Update `saveMeta()` to use msgpack
3. Update `loadMeta()` to use msgpack
4. Add migration for existing JSON files
5. Update file extension: `.meta.json` → `.meta.bin`
6. Add early size validation (warn if estimated >100MB)

### Phase 2: Short-term (2-3 hours)
**Implement Option 3: Reduce Metadata**

1. Audit metadata per section
2. Remove redundant content field
3. Optimize nested metadata objects
4. Document what's stored and why

### Phase 3: Long-term (16-20 hours)
**Consider Option 4: SQLite Storage**

1. Spike: Prototype SQLite implementation
2. Benchmark: Compare performance vs binary files
3. Decide: If benefits justify effort
4. Implement: If approved

---

## Implementation Details

### Priority 1: Binary Format

**Files to Modify**:
- `src/embeddings/vector-store.ts` (save/load methods)
- `package.json` (add dependency)
- `src/embeddings/types.ts` (update type docs)

**New Code**:
```typescript
import * as msgpack from '@msgpack/msgpack';

export class VectorStore {
  private getMetaPath(): string {
    return path.join(this.indexDir, 'vectors.meta.bin'); // Changed extension
  }

  private async saveMeta(meta: VectorMetadata[]): Promise<void> {
    return yield* Effect.tryPromise({
      try: async () => {
        // Validate size before encoding
        const estimatedSize = meta.length * 15000; // 15KB per section
        if (estimatedSize > 100_000_000) {
          console.warn(
            `Large metadata detected: ~${(estimatedSize / 1e6).toFixed(0)}MB. ` +
            `Consider indexing subdirectories separately.`
          );
        }

        // Encode with MessagePack
        const encoded = msgpack.encode(meta);
        await fs.writeFile(this.getMetaPath(), encoded);
      },
      catch: (e) =>
        new VectorStoreError({
          operation: 'save',
          message: `Failed to write metadata: ${e.message}`,
          cause: e,
        })
    });
  }

  private async loadMeta(): Promise<VectorMetadata[]> {
    return yield* Effect.tryPromise({
      try: async () => {
        const metaPath = this.getMetaPath();

        // Try binary format first (new)
        if (await fs.exists(metaPath)) {
          const buffer = await fs.readFile(metaPath);
          return msgpack.decode(buffer) as VectorMetadata[];
        }

        // Fall back to JSON for migration (old)
        const jsonPath = metaPath.replace('.bin', '.json');
        if (await fs.exists(jsonPath)) {
          const json = await fs.readFile(jsonPath, 'utf-8');
          const meta = JSON.parse(json);

          // Auto-migrate to binary format
          await this.saveMeta(meta);
          await fs.unlink(jsonPath); // Remove old JSON

          return meta;
        }

        return [];
      },
      catch: (e) =>
        new VectorStoreError({
          operation: 'load',
          message: `Failed to read metadata: ${e.message}`,
          cause: e,
        })
    });
  }
}
```

**Testing Plan**:
1. Unit tests: Encode/decode various sizes
2. Integration: Test on mdcontext corpus (120 docs) - should still work
3. Integration: Test on agentic-flow corpus (1561 docs) - should now work
4. Migration: Test auto-migration from JSON to binary
5. Performance: Benchmark binary vs JSON (expect 2-5x faster)

**Rollout**:
1. Implement in feature branch
2. Test on both corpora
3. Merge to main
4. Document in CHANGELOG.md
5. Notify users to re-index if they have existing embeddings

---

## Validation Criteria

### Success Metrics
- ✅ agentic-flow (1561 docs) completes successfully
- ✅ Metadata file size reduced by 30-50%
- ✅ Load/save times improved by 2-5x
- ✅ Auto-migration from JSON works
- ✅ No regressions on small corpora

### Edge Cases to Test
1. Empty corpus (0 docs)
2. Single doc corpus
3. Small corpus (120 docs) - existing test
4. Medium corpus (500-1000 docs) - new test needed
5. Large corpus (1500+ docs) - agentic-flow
6. Very large corpus (5000+ docs) - future test

---

## Risk Assessment

### Low Risk
- Binary format is well-tested (MessagePack)
- Backward compatible (auto-migration)
- Easy rollback (keep JSON generation as fallback)

### Medium Risk
- Dependencies (new npm package)
- File format change (could affect external tools)
- Migration complexity (testing required)

### Mitigation
1. Thorough testing on both small and large corpora
2. Keep JSON as fallback/export option
3. Clear migration documentation
4. Version metadata format (add version field)

---

## Timeline

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add MessagePack dependency | 15 min | None |
| Implement saveMeta binary | 1 hour | Dependency |
| Implement loadMeta binary | 1 hour | saveMeta |
| Add migration logic | 1 hour | loadMeta |
| Add size validation | 30 min | None |
| Write unit tests | 1 hour | Implementation |
| Test on mdcontext | 15 min | Tests |
| Test on agentic-flow | 30 min | Tests |
| Documentation | 30 min | Testing |
| Code review & merge | 30 min | Documentation |

**Total**: ~6 hours

---

## Next Steps

1. ✅ **Completed**: Test and document current behavior
2. ⏭️ **Next**: Implement binary format (Option 1)
3. 🔜 **After**: Reduce metadata size (Option 3)
4. 🔮 **Future**: Consider SQLite (Option 4)

---

## References

- MessagePack: https://msgpack.org/
- CBOR: https://cbor.io/
- V8 String Limits: https://v8.dev/blog/string-length
- Test Results: `/Users/alphab/Dev/LLM/DEV/mdcontext/research/mdcontext-pudding/01-index-embed.md`

---

**Created**: 2026-01-27
**Author**: Claude Sonnet 4.5
**Status**: Ready for implementation
**Priority**: P0 - Critical
