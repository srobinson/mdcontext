# mdcontext tree Command - Research and Testing

## Overview

The `mdcontext tree` command serves dual purposes:
1. **Directory mode**: Lists all markdown files in a directory hierarchy
2. **File mode**: Shows document structure with heading hierarchy and token counts

This is a clever design that provides both high-level navigation and detailed document insight through a single command.

## Test Environment

- Repository: `/Users/alphab/Dev/LLM/DEV/agentic-flow`
- Files indexed: 1,561 markdown documents
- Sections: 52,714
- Test date: 2026-01-26

## Command Syntax

```bash
mdcontext tree [path] [options]

Options:
  --json    Output as JSON
  --pretty  Pretty-print JSON output
```

## Usage Patterns

### 1. File Tree (Directory Mode)

When passed a directory path, shows all markdown files in the tree:

```bash
# List all markdown files in current directory
cd /Users/alphab/Dev/LLM/DEV/agentic-flow
mdcontext tree

# Output format:
# Markdown files in /Users/alphab/Dev/LLM/DEV/agentic-flow:
#
#   CLAUDE.md
#   README.md
#   agentic-flow/CHANGELOG.md
#   agentic-flow/README.md
#   ...
```

**Performance**: 685ms for 1,561 files (very fast)

### 2. Document Outline (File Mode)

When passed a file path, shows heading structure with token counts:

```bash
# Show document outline
mdcontext tree README.md

# Output:
# 🚀 Agentic-Flow v2.0.0-alpha
# Total tokens: 18095
#
# 🚀 Agentic-Flow v2.0.0-alpha [269 tokens]
#   ## 🎉 What's New in v2.0.0-alpha [16 tokens]
#     ### SONA: Self-Optimizing Neural Architecture  🧠 [249 tokens]
#     ### Complete AgentDB@alpha Integration  🧠 [246 tokens]
#   ## 📖 Table of Contents [237 tokens]
#   ...
```

**Performance**: 620ms for a 3,008-line document (42,521 tokens) - excellent

## Output Formats

### 1. Human-Readable (Default)

Directory listing:
```
Markdown files in /path/to/directory:

  file1.md
  file2.md
  subdir/file3.md

Total: X files
```

Document outline:
```
# Document Title
Total tokens: XXXX

# Heading 1 [XXX tokens]
  ## Heading 2 [XXX tokens]
    ### Heading 3 [XXX tokens]
```

### 2. JSON Format

Directory listing (--json):
```json
[
  {
    "path": "/absolute/path/to/file.md",
    "relativePath": "relative/path/to/file.md"
  },
  ...
]
```

Document outline (--json --pretty):
```json
{
  "title": "Document Title",
  "path": "/absolute/path/to/file.md",
  "totalTokens": 18095,
  "sections": [
    {
      "heading": "Main Heading",
      "level": 1,
      "tokens": 269,
      "children": [
        {
          "heading": "Sub Heading",
          "level": 2,
          "tokens": 16,
          "children": []
        }
      ]
    }
  ]
}
```

## Test Results

### Test 1: Large Repository Tree View

```bash
cd /Users/alphab/Dev/LLM/DEV/agentic-flow
time mdcontext tree
```

**Results**:
- Files listed: 1,561 markdown files
- Time: 685ms (0.75s user + 0.21s system)
- CPU: 141%
- Status: Excellent performance

### Test 2: Subdirectory Filtering

```bash
mdcontext tree docs/guides/
```

**Results**:
- Files found: 28 files (including subdirectories)
- Time: 576ms
- Output: Clean, relative paths from specified directory
- Includes subdirectories: Yes (e.g., `getting-started/quick-start.md`)

**Comparison with filesystem**:
```bash
ls -1 docs/guides/*.md | wc -l  # 26 files (only top level)
mdcontext tree docs/guides/      # 28 files (includes subdirs)
```

The tree command correctly includes nested directories, while shell globbing doesn't by default.

### Test 3: Document Outline - Small File

```bash
mdcontext tree docs/guides/README.md
```

**Output**:
```
# User Guides
Total tokens: 221

# User Guides [28 tokens]
  ## Getting Started [95 tokens]
  ## Model Configuration [47 tokens]
  ## Examples [45 tokens]
```

**Quality**: Perfect extraction, clear hierarchy

### Test 4: Document Outline - Large Complex File

```bash
mdcontext tree docs/research/JJ_INTEGRATION_ANALYSIS.md
```

**Results**:
- File size: 3,008 lines
- Total tokens: 42,521
- Sections extracted: ~50+ headings
- Nesting levels: Up to 4 levels (####)
- Time: 620ms
- Quality: Excellent - accurately captured nested structure

**Sample output**:
```
# Jujutsu (jj) VCS Integration with Agentic-Flow and AgentDB
Total tokens: 42521

# Jujutsu (jj) VCS Integration with Agentic-Flow and AgentDB [22 tokens]
  ## Ultra-Deep Research and Analysis [71 tokens]
  ## Executive Summary [139 tokens]
    ### Key Findings [246 tokens]
  ## 1. Jujutsu VCS Core Capabilities [13 tokens]
    ### 1.1 Operation Log Architecture [489 tokens]
    ### 1.2 Working Copy Management [265 tokens]
    ...
  ## 6. Technical Architecture [11 tokens]
    ### 6.1 System Overview [2654 tokens]
    ### 6.2 Data Flow [447 tokens]
    ### 6.3 Integration Layers [11 tokens]
      #### Layer 1: CLI Wrapper (Immediate Implementation) [981 tokens]
      #### Layer 2: Node.js Native Module (Future) [569 tokens]
```

### Test 5: Document Outline - Medium Complexity

```bash
mdcontext tree docs/guides/MULTI-MODEL-ROUTER.md
```

**Results**:
- Total tokens: 9,784
- Heading levels: 1-4 (with proper nesting)
- Token distribution visible per section
- Formatting preserved (emojis in headings)

### Test 6: JSON Output

```bash
mdcontext tree docs/guides/ --json | head -100
```

**Results**:
- Format: Array of objects with `path` and `relativePath`
- Size: Large (64KB for 522 files in docs/)
- Structure: Clean, parseable, useful for programmatic access
- Performance: Same speed as regular output

### Test 7: Pretty JSON Output

```bash
mdcontext tree README.md --json --pretty | head -100
```

**Results**:
- Format: Hierarchical tree structure
- Fields: `title`, `path`, `totalTokens`, `sections[]`
- Section structure: `heading`, `level`, `tokens`, `children[]`
- Nesting: Properly nested with children arrays
- Quality: Machine-readable and human-inspectable

### Test 8: Pattern Matching (Attempted)

```bash
mdcontext tree 'docs/guides/*.md'
```

**Result**: ❌ Error - glob patterns not supported
```
FileReadError: Cannot access path: ENOENT: no such file or directory,
stat '/Users/alphab/Dev/LLM/DEV/agentic-flow/docs/guides/*.md'
```

**Note**: The command expects a literal directory or file path, not shell glob patterns. Use directory mode instead to list all files in a directory.

## Use Cases

### 1. Repository Navigation

**Scenario**: Exploring a new codebase
```bash
mdcontext tree              # Get overview of all markdown files
mdcontext tree docs/        # Focus on documentation
mdcontext tree README.md    # Understand main document structure
```

**Value**: Quick orientation without opening files

### 2. Documentation Planning

**Scenario**: Understanding document scope and organization
```bash
mdcontext tree docs/guides/MULTI-MODEL-ROUTER.md
```

**Output shows**:
- Total token count (9,784) - useful for context windows
- Section hierarchy - see organization at a glance
- Token distribution - identify heavy sections

**Value**: Token budget planning, structure review

### 3. IDE Integration

**Scenario**: Building a documentation browser
```bash
mdcontext tree docs/ --json --pretty
```

**JSON output** enables:
- File tree views
- Table of contents generation
- Document navigation panels
- Search result previews

**Example integration**:
```javascript
const files = JSON.parse(await exec('mdcontext tree docs/ --json'));
const toc = JSON.parse(await exec('mdcontext tree README.md --json'));

// Build interactive documentation browser
files.forEach(file => {
  const outline = JSON.parse(await exec(`mdcontext tree ${file.path} --json`));
  renderDocumentWithTOC(outline);
});
```

### 4. Content Analysis

**Scenario**: Finding oversized sections for splitting
```bash
mdcontext tree large-doc.md | grep -E '\[([0-9]{4,}) tokens\]'
```

**Use**: Identify sections > 1000 tokens that might need splitting

### 5. Documentation Quality Checks

**Scenario**: Verify all documents have proper structure
```bash
for file in $(mdcontext tree docs/ --json | jq -r '.[].path'); do
  mdcontext tree "$file" --json | jq '.sections | length'
done
```

**Use**: Ensure minimum heading structure exists

### 6. LLM Context Preparation

**Scenario**: Check if document fits in context window
```bash
mdcontext tree README.md | head -3
# Output: Total tokens: 18095
```

**Decision**: 18k tokens fits in most context windows, proceed

### 7. Documentation Refactoring

**Scenario**: Understanding token distribution before restructuring
```bash
mdcontext tree docs/guides/MCP-AUTHENTICATION.md
```

**Shows**:
- Which sections are heaviest
- Nesting depth issues
- Potential splitting points

## Performance Analysis

### Speed Tests

| Operation | Files/Size | Time | Notes |
|-----------|-----------|------|-------|
| Full repo tree | 1,561 files | 685ms | Excellent |
| Subdirectory tree | 28 files | 576ms | Fast (includes index lookup) |
| Small file outline | 221 tokens | ~600ms | Fast |
| Large file outline | 42,521 tokens | 620ms | Excellent (3,008 lines) |
| JSON output | Same | ~same | No performance penalty |

**Key Insights**:
- Performance scales well with repository size
- Large document parsing is very efficient
- No significant overhead for JSON formatting
- Index lookup is fast (indexed files only)

### Scalability

The command operates on **indexed files only**, which means:
- Performance depends on index quality
- Unindexed files won't appear
- Changes require re-indexing
- Speed benefits from index caching

**Test**: After indexing (579ms for 1,561 docs), tree command is instant (685ms)

## Heading Extraction Quality

### Test: Complex Nesting

Tested on file with 4 levels of headings:
```markdown
# Level 1
## Level 2
### Level 3
#### Level 4
```

**Result**: ✅ All levels correctly extracted and nested

### Test: Emoji Handling

Tested on headings with emojis:
```markdown
# 🚀 Agentic-Flow v2.0.0-alpha
## 🎉 What's New
```

**Result**: ✅ Emojis preserved in output

### Test: Numbered Headings

Tested on structured documentation:
```markdown
## 1. Jujutsu VCS Core Capabilities
### 1.1 Operation Log Architecture
### 1.2 Working Copy Management
```

**Result**: ✅ Numbers preserved, correct nesting

### Test: Token Counting

Examined token counts across sections:

**Observations**:
- Small headings: 10-50 tokens (mostly structure)
- Content sections: 100-500 tokens (normal paragraphs)
- Large sections: 500-2000+ tokens (complex content)
- Very heavy sections: 2654 tokens (System Overview in test file)

**Accuracy**: Token counts appear accurate (using tiktoken internally)

## Edge Cases and Limitations

### 1. Glob Pattern Support

**Issue**: Shell glob patterns are NOT supported
```bash
mdcontext tree 'docs/*.md'  # ❌ Fails
```

**Workaround**: Use directory mode
```bash
mdcontext tree docs/  # ✅ Works - lists all files recursively
```

### 2. Depth Limits

**Observation**: No apparent depth limit in help output
**Test needed**: Does it limit directory recursion depth?
**Current behavior**: Appears to recurse fully through directories

### 3. Hidden Files

From indexing output: "20 hidden" files were skipped
**Question**: Can tree command show hidden files?
**Current**: Follows index, which skips hidden files by default

### 4. Large Repositories

**Tested**: 1,561 files performed well (685ms)
**Question**: What happens with 10k+ files?
**Expectation**: Should still be fast (index-based lookup)

### 5. Malformed Markdown

**Not tested**: How does it handle documents with:
- Missing closing headings
- Invalid nesting (### before ##)
- Duplicate heading text

**Expected**: Likely handles gracefully (remark-based parser)

## Comparison with Alternatives

### vs `find` + `ls`
```bash
find . -name "*.md"           # Finds all .md files
mdcontext tree                # Finds indexed markdown files
```

**Advantage mdcontext**:
- Filters to indexed files only
- Respects .gitignore patterns
- Cleaner output formatting
- Includes relative paths

### vs `tree` command
```bash
tree -P "*.md"                # File system tree
mdcontext tree                # Document tree
```

**Advantage mdcontext**:
- Document-aware (not just files)
- Token counting built-in
- JSON output for integration
- Outline view for files

### vs manual TOC generation
```bash
grep "^#" README.md            # Extract headings
mdcontext tree README.md       # Full outline with tokens
```

**Advantage mdcontext**:
- Token counts per section
- Proper nesting structure
- Machine-readable JSON
- Consistent formatting

## Integration Ideas

### 1. VSCode Extension

**Feature**: Documentation sidebar
```typescript
// Fetch file tree
const tree = await exec('mdcontext tree --json');

// Render in sidebar
tree.forEach(file => {
  const outline = await exec(`mdcontext tree ${file.path} --json`);
  renderOutline(outline);
});
```

**UI**:
- File tree with markdown files
- Click to see outline
- Token counts visible
- Search within structure

### 2. Documentation Site Generator

**Feature**: Auto-generate navigation
```javascript
const files = JSON.parse(await exec('mdcontext tree docs/ --json'));

// Build nav structure
const nav = buildNav(files);

// Generate TOC for each page
files.forEach(async file => {
  const outline = JSON.parse(
    await exec(`mdcontext tree ${file.path} --json`)
  );
  generatePage(file, outline);
});
```

### 3. LLM Context Builder

**Feature**: Smart document selection
```bash
# Check document size before adding to context
SIZE=$(mdcontext tree README.md | head -2 | tail -1 | grep -oE '[0-9]+')

if [ $SIZE -lt 5000 ]; then
  mdcontext context README.md >> context.txt
else
  echo "Document too large, skipping"
fi
```

### 4. Documentation Linter

**Feature**: Enforce structure rules
```javascript
const outline = JSON.parse(
  await exec('mdcontext tree docs/guide.md --json')
);

// Check rules
if (outline.sections.length === 0) {
  error('Document has no headings');
}

outline.sections.forEach(section => {
  if (section.tokens > 1000) {
    warn(`Section "${section.heading}" is too long (${section.tokens} tokens)`);
  }
});
```

### 5. API Documentation Generator

**Feature**: Parse API docs structure
```bash
# Find all API reference files
mdcontext tree docs/api/ --json | jq -r '.[].path' | while read file; do
  # Extract structure
  mdcontext tree "$file" --json | \
    jq '.sections[] | select(.level == 2) | .heading'
done
```

### 6. Git Pre-commit Hook

**Feature**: Validate documentation changes
```bash
# In .git/hooks/pre-commit
for file in $(git diff --cached --name-only | grep '\.md$'); do
  outline=$(mdcontext tree "$file" --json)
  tokens=$(echo "$outline" | jq '.totalTokens')

  if [ $tokens -gt 10000 ]; then
    echo "Warning: $file is very large ($tokens tokens)"
  fi
done
```

## Issues Found

### Issue 1: Glob Pattern Not Supported

**Expected**: `mdcontext tree 'docs/*.md'` would filter files
**Actual**: Error - literal path interpretation only
**Severity**: Minor - directory mode works well enough
**Workaround**: Use directory path instead

### Issue 2: No Depth Limit Option

**Observation**: No `--max-depth` flag
**Use case**: List only top-level subdirectories
**Current**: Always recurses fully
**Impact**: Minor - usually want full tree anyway

### Issue 3: No File Count in Directory Mode Output

**Observation**: Says "Total: X files" at end, but not in JSON
**JSON output**: Just array of files
**Suggestion**: Add metadata to JSON output:
```json
{
  "root": "/path/to/dir",
  "count": 1561,
  "files": [...]
}
```

## Recommendations

### For Users

1. **Start with tree view** - Get repository overview first
2. **Use outline for planning** - Check token counts before editing
3. **JSON for scripting** - Integrate with build tools
4. **Directory mode for discovery** - Find relevant documentation quickly

### For Integration

1. **Cache outline data** - Parse once, use many times
2. **Build navigation from JSON** - Clean structured data
3. **Show token budgets** - Help users stay within context limits
4. **Enable filtering** - Let users explore structure interactively

### For mdcontext Development

1. **Add glob pattern support** - More flexible file filtering
2. **Include metadata in JSON** - File counts, timestamps
3. **Add depth limiting** - Optional for large trees
4. **Consider section IDs** - Enable linking to sections
5. **Add filtering options** - By token count, heading level, etc.

## Conclusion

The `mdcontext tree` command is a powerful dual-purpose tool that excels at both repository navigation and document structure analysis.

**Strengths**:
- Fast performance (sub-second for large repos)
- Clean, intuitive output
- Excellent heading extraction
- Useful token counting
- Strong JSON output for integration
- Smart dual-mode design (directory vs file)

**Use Cases**:
- Repository exploration and navigation
- Documentation planning and token budgeting
- IDE and tooling integration
- Content analysis and quality checks
- LLM context window management

**Performance**:
- Grade: A
- Scales well with repository size
- Handles large documents efficiently
- No performance penalty for JSON output

**Overall Assessment**: This is a well-designed, practical command that provides real value for both human users and programmatic integration. The dual-mode behavior (directory listing vs document outline) is clever and intuitive. The addition of token counts makes it particularly useful for LLM-related workflows.

**Primary Value**: Bridges the gap between file system navigation and document content understanding, all while being cognizant of token budgets.
