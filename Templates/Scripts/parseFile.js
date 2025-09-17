/**
 * FileParser class for parsing and reassembling Obsidian files
 * Handles frontmatter, H1 title, and content separately
 */
class FileParser {
  constructor(file) {
    this.file = file;
    this.frontmatter = {};
    this.title = '';
    this.content = '';
  }

  /**
   * Parse the file and extract all components
   */
  async parse() {
    let rawContent = await app.vault.read(this.file);
    const originalContent = rawContent;

    // 1. Check if frontmatter exists at the very beginning
    const frontmatterMatch = rawContent.match(/^---\s*[\s\S]*?\s*---\s*/);
    let hasFrontmatter = false;

    if (frontmatterMatch) {
      // Verify frontmatter is at the very beginning (no content before it)
      const beforeFrontmatter = rawContent.substring(0, frontmatterMatch.index);
      if (beforeFrontmatter.trim() === '') {
        hasFrontmatter = true;
        rawContent = rawContent.substring(frontmatterMatch[0].length);
      }
    }

    // Use Obsidian's metadata cache to get frontmatter as object only if valid
    if (hasFrontmatter) {
      const fileCache = app.metadataCache.getFileCache(this.file);
      this.frontmatter = fileCache?.frontmatter || {};
    } else {
      this.frontmatter = {};
    }

    // 2. Check for H1 title immediately after frontmatter (only whitespace/newlines allowed)
    let hasH1Title = false;

    // Look for H1 at the beginning of remaining content (after frontmatter)
    const h1Match = rawContent.match(/^(\s*)#\s+(.*)/);

    if (h1Match) {
      const beforeH1 = h1Match[1]; // Captured whitespace before #
      // Only allow whitespace and newlines before H1
      if (/^\s*$/.test(beforeH1)) {
        hasH1Title = true;
        this.title = h1Match[2].trim();

        // 3. Update rawContent to remove H1 title and following whitespace/newlines
        const h1FullMatch = h1Match[0]; // Full match including whitespace
        const h1EndIndex = rawContent.indexOf(h1FullMatch) + h1FullMatch.length;

        // Remove H1 and any immediately following whitespace/newlines
        this.content = rawContent.substring(h1EndIndex).replace(/^[\s\n]*/, '');
      } else {
        // H1 exists but not immediately after frontmatter, treat as no H1
        this.title = '';
        this.content = rawContent.trim();
      }
    } else {
      // No H1 found
      this.title = '';
      this.content = rawContent.trim();
    }

    // If no H1 title, use the file name
    if (!this.title) {
      this.title = this.file.basename;
    }

    return this;
  }

  /**
   * Get frontmatter property value
   */
  getFrontmatterProperty(key) {
    return this.frontmatter[key];
  }

  /**
   * Set frontmatter property value
   */
  setFrontmatterProperty(key, value) {
    this.frontmatter[key] = value;
  }

  /**
   * Update H1 title text (without # symbol)
   */
  setTitle(newTitle) {
    this.title = newTitle;
  }

  /**
   * Update content
   */
  setContent(newContent) {
    this.content = newContent;
  }

  /**
   * Check if frontmatter exists
   */
  hasFrontmatter() {
    return Object.keys(this.frontmatter).length > 0;
  }

  /**
   * Check if H1 title exists
   */
  hasTitle() {
    return this.title.trim() !== '';
  }

  /**
   * Convert frontmatter object back to YAML text block
   */
  _frontmatterObjToText() {
    if (!this.hasFrontmatter()) {
      return '';
    }

    const lines = ['---'];
    for (const [key, value] of Object.entries(this.frontmatter)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Reassemble all parts into complete file content
   */
  reassemble() {
    let result = '';

    // Add frontmatter if exists
    const frontmatterBlock = this._frontmatterObjToText();
    if (frontmatterBlock) {
      result += frontmatterBlock;
      result += '\n\n'; // Two newlines after frontmatter
    }

    // Add H1 title if exists
    if (this.hasTitle()) {
      result += `# ${this.title}`;
      if (this.content) {
        result += '\n\n'; // Two newlines after H1
      } else {
        result += '\n'; // One newline if no content
      }
    }

    // Add content
    if (this.content) {
      result += this.content;
    }

    return result;
  }

  /**
   * Save the reassembled content back to the file
   */
  async save() {
    await app.vault.modify(this.file, this.reassemble());
  }
}

/**
 * Factory function to create and parse a FileParser instance
 */
async function parseFile(tp, file) {
  const parser = new FileParser(file);
  await parser.parse();
  return parser;
}

module.exports = parseFile;
