class FileParser {
  constructor(file) {
    this.file = file;
    this.originalContent = '';
    this.frontmatter = {};
    this.title = '';
    this.content = '';
    this.changed = false;
  }

  /**
   * Parse the file and extract all components
   */
  async parse() {
    this.changed = false;

    let rawContent = await app.vault.read(this.file);
    this.originalContent = rawContent;

    // 1. Check if frontmatter exists at the very beginning
    const frontmatterMatch = rawContent.match(/^---\s*[\s\S]*?\s*---\s*/);
    let hasFrontmatter = false;

    if (frontmatterMatch) {
      // Verify frontmatter is at the very beginning (no content before it)
      const beforeFrontmatter = rawContent.substring(0, frontmatterMatch.index);
      if (!beforeFrontmatter?.trim()) {
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
      this.title = this.file.basename.trim();
      this.changed = true;
    }

    return this;
  }

  setFrontmatterProperty(key, value) {
    this.frontmatter[key] = value;
    this.changed = true;
  }

  setTitle(newTitle) {
    this.title = newTitle;
    this.changed = true;
  }

  setContent(newContent) {
    this.content = newContent;
    this.changed = true;
  }

  _frontmatterObjToText() {
    const keys = Object.keys(this.frontmatter);
    if (keys.length == 0) {
      return '';
    }

    const lines = ['---'];
    for (const key of keys) {
      const value = this.frontmatter[key];
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

  reassemble(withFrontmatter = true) {
    let result = '';

    // Add frontmatter if exists
    if (withFrontmatter) {
      const frontmatterBlock = this._frontmatterObjToText();
      if (frontmatterBlock) {
        result += frontmatterBlock;
        result += '\n\n'; // Two newlines after frontmatter
      }
    }

    // Add H1 title if exists
    if (this.title) {
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
    if (!this.changed) {
      return;
    }
    const content = this.reassemble();
    if (content === this.originalContent) {
      return;
    }
    await app.vault.modify(this.file, content);
  }
}

/**
 * Factory function to create and parse a FileParser instance
 */
async function parseFile(tp, file = undefined) {
  if (!file) {
    file = tp.file.find_tfile(tp.file.path(true));
  } else if (typeof file === 'string') {
    file = tp.file.find_tfile(file);
  } else if (file.path) {
    file = tp.file.find_tfile(file.path);
  }
  if (!file) {
    throw new Error('Invalid parameter');
  }
  const parser = new FileParser(file);
  await parser.parse();
  return parser;
}

module.exports = parseFile;
