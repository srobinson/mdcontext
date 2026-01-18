/**
 * Index storage operations
 */

import { Effect } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";

import type {
  IndexConfig,
  DocumentIndex,
  SectionIndex,
  LinkIndex,
} from "./types.js";
import { INDEX_VERSION, getIndexPaths } from "./types.js";

// ============================================================================
// File System Helpers
// ============================================================================

const ensureDir = (dirPath: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dirPath, { recursive: true }),
    catch: (e) => new Error(`Failed to create directory ${dirPath}: ${e}`),
  }).pipe(Effect.map(() => undefined));

const readJsonFile = <T>(filePath: string): Effect.Effect<T | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
      } catch {
        return null;
      }
    },
    catch: (e) => new Error(`Failed to read ${filePath}: ${e}`),
  });

const writeJsonFile = <T>(filePath: string, data: T): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const dir = path.dirname(filePath);
    yield* ensureDir(dir);
    yield* Effect.tryPromise({
      try: () => fs.writeFile(filePath, JSON.stringify(data, null, 2)),
      catch: (e) => new Error(`Failed to write ${filePath}: ${e}`),
    });
  });

// ============================================================================
// Hash Computation
// ============================================================================

export const computeHash = (content: string): string => {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
};

// ============================================================================
// Index Storage Operations
// ============================================================================

export interface IndexStorage {
  readonly rootPath: string;
  readonly paths: ReturnType<typeof getIndexPaths>;
}

export const createStorage = (rootPath: string): IndexStorage => ({
  rootPath: path.resolve(rootPath),
  paths: getIndexPaths(path.resolve(rootPath)),
});

export const initializeIndex = (
  storage: IndexStorage
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* ensureDir(storage.paths.root);
    yield* ensureDir(storage.paths.parsed);
    yield* ensureDir(path.dirname(storage.paths.documents));

    // Create default config if it doesn't exist
    const existingConfig = yield* loadConfig(storage);
    if (!existingConfig) {
      const config: IndexConfig = {
        version: INDEX_VERSION,
        rootPath: storage.rootPath,
        include: ["**/*.md", "**/*.mdx"],
        exclude: ["**/node_modules/**", "**/.*/**"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      yield* saveConfig(storage, config);
    }
  });

// ============================================================================
// Config Operations
// ============================================================================

export const loadConfig = (
  storage: IndexStorage
): Effect.Effect<IndexConfig | null, Error> =>
  readJsonFile<IndexConfig>(storage.paths.config);

export const saveConfig = (
  storage: IndexStorage,
  config: IndexConfig
): Effect.Effect<void, Error> =>
  writeJsonFile(storage.paths.config, {
    ...config,
    updatedAt: new Date().toISOString(),
  });

// ============================================================================
// Document Index Operations
// ============================================================================

export const loadDocumentIndex = (
  storage: IndexStorage
): Effect.Effect<DocumentIndex | null, Error> =>
  readJsonFile<DocumentIndex>(storage.paths.documents);

export const saveDocumentIndex = (
  storage: IndexStorage,
  index: DocumentIndex
): Effect.Effect<void, Error> => writeJsonFile(storage.paths.documents, index);

export const createEmptyDocumentIndex = (rootPath: string): DocumentIndex => ({
  version: INDEX_VERSION,
  rootPath,
  documents: {},
});

// ============================================================================
// Section Index Operations
// ============================================================================

export const loadSectionIndex = (
  storage: IndexStorage
): Effect.Effect<SectionIndex | null, Error> =>
  readJsonFile<SectionIndex>(storage.paths.sections);

export const saveSectionIndex = (
  storage: IndexStorage,
  index: SectionIndex
): Effect.Effect<void, Error> => writeJsonFile(storage.paths.sections, index);

export const createEmptySectionIndex = (): SectionIndex => ({
  version: INDEX_VERSION,
  sections: {},
  byHeading: {},
  byDocument: {},
});

// ============================================================================
// Link Index Operations
// ============================================================================

export const loadLinkIndex = (
  storage: IndexStorage
): Effect.Effect<LinkIndex | null, Error> =>
  readJsonFile<LinkIndex>(storage.paths.links);

export const saveLinkIndex = (
  storage: IndexStorage,
  index: LinkIndex
): Effect.Effect<void, Error> => writeJsonFile(storage.paths.links, index);

export const createEmptyLinkIndex = (): LinkIndex => ({
  version: INDEX_VERSION,
  forward: {},
  backward: {},
  broken: [],
});

// ============================================================================
// Index Existence Check
// ============================================================================

export const indexExists = (
  storage: IndexStorage
): Effect.Effect<boolean, Error> =>
  Effect.tryPromise({
    try: async () => {
      try {
        await fs.access(storage.paths.config);
        return true;
      } catch {
        return false;
      }
    },
    catch: (e) => new Error(`Failed to check index existence: ${e}`),
  });
