/**
 * Indexer service for building and updating indexes
 */

import { Effect } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { parse } from "../parser/parser.js";
import type { MdSection } from "../core/types.js";
import type {
  DocumentEntry,
  SectionEntry,
  DocumentIndex,
  IndexResult,
  IndexBuildError,
} from "./types.js";
import {
  createStorage,
  initializeIndex,
  loadDocumentIndex,
  saveDocumentIndex,
  saveSectionIndex,
  loadLinkIndex,
  saveLinkIndex,
  createEmptyDocumentIndex,
  createEmptySectionIndex,
  createEmptyLinkIndex,
  computeHash,
} from "./storage.js";

// ============================================================================
// File Discovery
// ============================================================================

const isMarkdownFile = (filename: string): boolean =>
  filename.endsWith(".md") || filename.endsWith(".mdx");

const shouldExclude = (filePath: string, exclude: readonly string[]): boolean => {
  const normalized = filePath.toLowerCase();
  for (const pattern of exclude) {
    if (pattern.includes("node_modules") && normalized.includes("node_modules")) {
      return true;
    }
    if (pattern.startsWith("**/.*") && normalized.includes("/.")) {
      return true;
    }
  }
  return false;
};

const walkDirectory = async (
  dir: string,
  exclude: readonly string[]
): Promise<string[]> => {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    if (shouldExclude(fullPath, exclude)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await walkDirectory(fullPath, exclude);
      files.push(...subFiles);
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
};

// ============================================================================
// Section Flattening
// ============================================================================

const flattenSections = (
  sections: readonly MdSection[],
  docId: string,
  docPath: string
): SectionEntry[] => {
  const result: SectionEntry[] = [];

  const traverse = (section: MdSection): void => {
    result.push({
      id: section.id,
      documentId: docId,
      documentPath: docPath,
      heading: section.heading,
      level: section.level,
      startLine: section.startLine,
      endLine: section.endLine,
      tokenCount: section.metadata.tokenCount,
      hasCode: section.metadata.hasCode,
      hasList: section.metadata.hasList,
      hasTable: section.metadata.hasTable,
    });

    for (const child of section.children) {
      traverse(child);
    }
  };

  for (const section of sections) {
    traverse(section);
  }

  return result;
};

// ============================================================================
// Link Resolution
// ============================================================================

const resolveInternalLink = (
  href: string,
  fromPath: string,
  rootPath: string
): string | null => {
  if (href.startsWith("#")) {
    return fromPath;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return null;
  }

  const linkPath = href.split("#")[0] ?? "";
  if (!linkPath) return null;

  const fromDir = path.dirname(fromPath);
  const resolved = path.resolve(fromDir, linkPath);

  if (!resolved.startsWith(rootPath)) {
    return null;
  }

  return path.relative(rootPath, resolved);
};

// ============================================================================
// Index Building
// ============================================================================

export interface IndexOptions {
  readonly force?: boolean;
  readonly exclude?: readonly string[];
}

export const buildIndex = (
  rootPath: string,
  options: IndexOptions = {}
): Effect.Effect<IndexResult, Error> =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const storage = createStorage(rootPath);
    const errors: IndexBuildError[] = [];

    // Initialize storage
    yield* initializeIndex(storage);

    // Load existing indexes or create empty ones
    const existingDocIndex = yield* loadDocumentIndex(storage);
    const docIndex: DocumentIndex =
      options.force || !existingDocIndex
        ? createEmptyDocumentIndex(storage.rootPath)
        : existingDocIndex;

    const sectionIndex = createEmptySectionIndex();
    const linkIndex = createEmptyLinkIndex();

    // Discover files
    const exclude = options.exclude ?? ["**/node_modules/**", "**/.*/**"];
    const files = yield* Effect.tryPromise({
      try: () => walkDirectory(storage.rootPath, exclude),
      catch: (e) => new Error(`Failed to walk directory: ${e}`),
    });

    // Process each file
    let documentsIndexed = 0;
    let sectionsIndexed = 0;
    let linksIndexed = 0;

    const mutableDocuments: Record<string, DocumentEntry> = { ...docIndex.documents };
    const mutableSections: Record<string, SectionEntry> = {};
    const mutableByHeading: Record<string, string[]> = {};
    const mutableByDocument: Record<string, string[]> = {};
    const mutableForward: Record<string, string[]> = {};
    const mutableBackward: Record<string, string[]> = {};
    const brokenLinks: string[] = [];

    for (const filePath of files) {
      const relativePath = path.relative(storage.rootPath, filePath);

      try {
        // Read file content and stats
        const [content, stats] = yield* Effect.promise(() =>
          Promise.all([
            fs.readFile(filePath, "utf-8"),
            fs.stat(filePath),
          ])
        );

        const hash = computeHash(content);
        const existingEntry = mutableDocuments[relativePath];

        // Skip if unchanged
        if (
          !options.force &&
          existingEntry &&
          existingEntry.hash === hash &&
          existingEntry.mtime === stats.mtime.getTime()
        ) {
          continue;
        }

        // Parse document
        const doc = yield* parse(content, {
          path: relativePath,
          lastModified: stats.mtime,
        }).pipe(
          Effect.mapError(
            (e) => new Error(`Parse error in ${relativePath}: ${e.message}`)
          )
        );

        // Update document index
        mutableDocuments[relativePath] = {
          id: doc.id,
          path: relativePath,
          title: doc.title,
          mtime: stats.mtime.getTime(),
          hash,
          tokenCount: doc.metadata.tokenCount,
          sectionCount: doc.metadata.headingCount,
        };

        documentsIndexed++;

        // Update section index
        const sections = flattenSections(doc.sections, doc.id, relativePath);
        mutableByDocument[doc.id] = [];

        for (const section of sections) {
          mutableSections[section.id] = section;
          mutableByDocument[doc.id]?.push(section.id);

          // Index by heading
          const headingKey = section.heading.toLowerCase();
          if (!mutableByHeading[headingKey]) {
            mutableByHeading[headingKey] = [];
          }
          mutableByHeading[headingKey]?.push(section.id);

          sectionsIndexed++;
        }

        // Update link index
        const internalLinks = doc.links.filter((l) => l.type === "internal");
        const outgoingLinks: string[] = [];

        for (const link of internalLinks) {
          const target = resolveInternalLink(
            link.href,
            filePath,
            storage.rootPath
          );

          if (target) {
            outgoingLinks.push(target);

            // Add to backward links
            if (!mutableBackward[target]) {
              mutableBackward[target] = [];
            }
            if (!mutableBackward[target]?.includes(relativePath)) {
              mutableBackward[target]?.push(relativePath);
            }

            linksIndexed++;
          }
        }

        mutableForward[relativePath] = outgoingLinks;
      } catch (error) {
        errors.push({
          path: relativePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check for broken links
    for (const [_from, targets] of Object.entries(mutableForward)) {
      for (const target of targets) {
        if (!mutableDocuments[target] && !brokenLinks.includes(target)) {
          brokenLinks.push(target);
        }
      }
    }

    // Save indexes
    yield* saveDocumentIndex(storage, {
      version: docIndex.version,
      rootPath: storage.rootPath,
      documents: mutableDocuments,
    });

    yield* saveSectionIndex(storage, {
      version: sectionIndex.version,
      sections: mutableSections,
      byHeading: mutableByHeading,
      byDocument: mutableByDocument,
    });

    yield* saveLinkIndex(storage, {
      version: linkIndex.version,
      forward: mutableForward,
      backward: mutableBackward,
      broken: brokenLinks,
    });

    const duration = Date.now() - startTime;

    return {
      documentsIndexed,
      sectionsIndexed,
      linksIndexed,
      duration,
      errors,
    };
  });

// ============================================================================
// Link Queries
// ============================================================================

export const getOutgoingLinks = (
  rootPath: string,
  filePath: string
): Effect.Effect<readonly string[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const linkIndex = yield* loadLinkIndex(storage);

    if (!linkIndex) {
      return [];
    }

    const relativePath = path.relative(storage.rootPath, path.resolve(filePath));
    return linkIndex.forward[relativePath] ?? [];
  });

export const getIncomingLinks = (
  rootPath: string,
  filePath: string
): Effect.Effect<readonly string[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const linkIndex = yield* loadLinkIndex(storage);

    if (!linkIndex) {
      return [];
    }

    const relativePath = path.relative(storage.rootPath, path.resolve(filePath));
    return linkIndex.backward[relativePath] ?? [];
  });

export const getBrokenLinks = (
  rootPath: string
): Effect.Effect<readonly string[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const linkIndex = yield* loadLinkIndex(storage);

    if (!linkIndex) {
      return [];
    }

    return linkIndex.broken;
  });
