/**
 * Structural search for md-tldr
 */

import { Effect } from "effect";
import * as path from "node:path";
import * as fs from "node:fs/promises";

import {
  createStorage,
  loadDocumentIndex,
  loadSectionIndex,
} from "../index/storage.js";
import type { SectionEntry, DocumentEntry } from "../index/types.js";

// ============================================================================
// Search Options
// ============================================================================

export interface SearchOptions {
  /** Filter by heading pattern (regex) */
  readonly heading?: string | undefined;
  /** Filter by file path pattern (glob-like) */
  readonly pathPattern?: string | undefined;
  /** Only sections with code blocks */
  readonly hasCode?: boolean | undefined;
  /** Only sections with lists */
  readonly hasList?: boolean | undefined;
  /** Only sections with tables */
  readonly hasTable?: boolean | undefined;
  /** Minimum heading level */
  readonly minLevel?: number | undefined;
  /** Maximum heading level */
  readonly maxLevel?: number | undefined;
  /** Maximum results */
  readonly limit?: number | undefined;
}

export interface SearchResult {
  readonly section: SectionEntry;
  readonly document: DocumentEntry;
  readonly content?: string;
}

// ============================================================================
// Path Matching
// ============================================================================

const matchPath = (filePath: string, pattern: string): boolean => {
  // Simple glob-like matching
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(filePath);
};

// ============================================================================
// Search Implementation
// ============================================================================

export const search = (
  rootPath: string,
  options: SearchOptions = {}
): Effect.Effect<readonly SearchResult[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);

    const docIndex = yield* loadDocumentIndex(storage);
    const sectionIndex = yield* loadSectionIndex(storage);

    if (!docIndex || !sectionIndex) {
      return [];
    }

    const results: SearchResult[] = [];
    const headingRegex = options.heading
      ? new RegExp(options.heading, "i")
      : null;

    for (const section of Object.values(sectionIndex.sections)) {
      // Filter by heading pattern
      if (headingRegex && !headingRegex.test(section.heading)) {
        continue;
      }

      // Filter by path pattern
      if (options.pathPattern && !matchPath(section.documentPath, options.pathPattern)) {
        continue;
      }

      // Filter by code blocks
      if (options.hasCode !== undefined && section.hasCode !== options.hasCode) {
        continue;
      }

      // Filter by lists
      if (options.hasList !== undefined && section.hasList !== options.hasList) {
        continue;
      }

      // Filter by tables
      if (options.hasTable !== undefined && section.hasTable !== options.hasTable) {
        continue;
      }

      // Filter by level range
      if (options.minLevel !== undefined && section.level < options.minLevel) {
        continue;
      }

      if (options.maxLevel !== undefined && section.level > options.maxLevel) {
        continue;
      }

      const document = docIndex.documents[section.documentPath];
      if (document) {
        results.push({ section, document });
      }

      // Check limit
      if (options.limit !== undefined && results.length >= options.limit) {
        break;
      }
    }

    return results;
  });

// ============================================================================
// Search with Content
// ============================================================================

export const searchWithContent = (
  rootPath: string,
  options: SearchOptions = {}
): Effect.Effect<readonly SearchResult[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const results = yield* search(rootPath, options);

    const resultsWithContent: SearchResult[] = [];

    for (const result of results) {
      const filePath = path.join(storage.rootPath, result.section.documentPath);

      try {
        const fileContent = yield* Effect.promise(() =>
          fs.readFile(filePath, "utf-8")
        );

        const lines = fileContent.split("\n");
        const sectionContent = lines
          .slice(result.section.startLine - 1, result.section.endLine)
          .join("\n");

        resultsWithContent.push({
          ...result,
          content: sectionContent,
        });
      } catch {
        // If file can't be read, include result without content
        resultsWithContent.push(result);
      }
    }

    return resultsWithContent;
  });

// ============================================================================
// Context Generation
// ============================================================================

export interface ContextOptions {
  /** Maximum tokens to include */
  readonly maxTokens?: number | undefined;
  /** Include section content */
  readonly includeContent?: boolean | undefined;
  /** Compression level: brief, summary, full */
  readonly level?: "brief" | "summary" | "full" | undefined;
}

export interface DocumentContext {
  readonly path: string;
  readonly title: string;
  readonly totalTokens: number;
  readonly includedTokens: number;
  readonly sections: readonly SectionContext[];
}

export interface SectionContext {
  readonly heading: string;
  readonly level: number;
  readonly tokens: number;
  readonly content?: string | undefined;
  readonly hasCode: boolean;
  readonly hasList: boolean;
  readonly hasTable: boolean;
}

export const getContext = (
  rootPath: string,
  filePath: string,
  options: ContextOptions = {}
): Effect.Effect<DocumentContext, Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const resolvedFile = path.resolve(filePath);
    const relativePath = path.relative(storage.rootPath, resolvedFile);

    const docIndex = yield* loadDocumentIndex(storage);
    const sectionIndex = yield* loadSectionIndex(storage);

    if (!docIndex || !sectionIndex) {
      return yield* Effect.fail(new Error("Index not found. Run 'mdtldr index' first."));
    }

    const document = docIndex.documents[relativePath];
    if (!document) {
      return yield* Effect.fail(new Error(`Document not found in index: ${relativePath}`));
    }

    // Get sections for this document
    const sectionIds = sectionIndex.byDocument[document.id] ?? [];
    const sections: SectionContext[] = [];
    let includedTokens = 0;
    const maxTokens = options.maxTokens ?? Infinity;
    const includeContent = options.includeContent ?? (options.level === "full");

    // Read file content if needed
    let fileContent: string | null = null;
    if (includeContent) {
      try {
        fileContent = yield* Effect.promise(() =>
          fs.readFile(resolvedFile, "utf-8")
        );
      } catch {
        // Continue without content
      }
    }

    const fileLines = fileContent?.split("\n") ?? [];

    for (const sectionId of sectionIds) {
      const section = sectionIndex.sections[sectionId];
      if (!section) continue;

      // Check token budget
      if (includedTokens + section.tokenCount > maxTokens) {
        // Include brief info only if we're over budget
        if (options.level === "brief") continue;

        sections.push({
          heading: section.heading,
          level: section.level,
          tokens: section.tokenCount,
          hasCode: section.hasCode,
          hasList: section.hasList,
          hasTable: section.hasTable,
        });
        continue;
      }

      includedTokens += section.tokenCount;

      let content: string | undefined;
      if (includeContent && fileContent) {
        content = fileLines
          .slice(section.startLine - 1, section.endLine)
          .join("\n");
      }

      sections.push({
        heading: section.heading,
        level: section.level,
        tokens: section.tokenCount,
        content,
        hasCode: section.hasCode,
        hasList: section.hasList,
        hasTable: section.hasTable,
      });
    }

    return {
      path: relativePath,
      title: document.title,
      totalTokens: document.tokenCount,
      includedTokens,
      sections,
    };
  });

// ============================================================================
// LLM-Ready Output
// ============================================================================

export const formatContextForLLM = (context: DocumentContext): string => {
  const lines: string[] = [];

  lines.push(`# ${context.title}`);
  lines.push(`Path: ${context.path}`);
  lines.push(`Tokens: ${context.includedTokens}/${context.totalTokens}`);
  lines.push("");

  for (const section of context.sections) {
    const prefix = "#".repeat(section.level);
    const meta: string[] = [];
    if (section.hasCode) meta.push("code");
    if (section.hasList) meta.push("list");
    if (section.hasTable) meta.push("table");

    const metaStr = meta.length > 0 ? ` [${meta.join(", ")}]` : "";
    lines.push(`${prefix} ${section.heading}${metaStr} (${section.tokens} tokens)`);

    if (section.content) {
      lines.push("");
      lines.push(section.content);
      lines.push("");
    }
  }

  return lines.join("\n");
};
