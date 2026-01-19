/**
 * CLI Utility Functions
 *
 * Shared helper functions used across CLI commands.
 */

import * as fsPromises from 'node:fs/promises'
import * as path from 'node:path'

/**
 * Format object as JSON string
 */
export const formatJson = (obj: unknown, pretty: boolean): string => {
  return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)
}

/**
 * Check if filename is a markdown file
 */
export const isMarkdownFile = (filename: string): boolean => {
  return filename.endsWith('.md') || filename.endsWith('.mdx')
}

/**
 * Recursively walk directory and collect markdown files
 */
export const walkDir = async (dir: string): Promise<string[]> => {
  const files: string[] = []
  const entries = await fsPromises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip hidden directories and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue
    }

    if (entry.isDirectory()) {
      const subFiles = await walkDir(fullPath)
      files.push(...subFiles)
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Check if a query looks like a regex pattern
 */
export const isRegexPattern = (query: string): boolean => {
  // Has regex special characters (excluding simple spaces and common punctuation)
  return /[.*+?^${}()|[\]\\]/.test(query)
}

/**
 * Check if embeddings exist for a directory
 */
export const hasEmbeddings = async (dir: string): Promise<boolean> => {
  const embeddingsPath = path.join(dir, '.tldr', 'embeddings.bin')
  try {
    await fsPromises.access(embeddingsPath)
    return true
  } catch {
    return false
  }
}
