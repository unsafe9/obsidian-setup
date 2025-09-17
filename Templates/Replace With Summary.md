<%*
const file = tp.app.vault.getAbstractFileByPath(tp.file.path(true));
new Notice(`Summarizing '${file.path}'...`, 5000);
const summary = await tp.user.summarize(tp, file.path);

// Rewrite the file content below the frontmatter and the H1 title with the summary
const content = await tp.app.vault.read(file);

// Extract frontmatter if it exists
const frontmatterMatch = content.match(/^---\s*[\s\S]*?\s*---\s*/);
const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';

// Extract H1 title if it exists
const h1Match = content.match(/^(#+\s+.*)/m);
const h1Title = h1Match ? h1Match[0] + '\n' : '';

// Calculate the position where the summary should be inserted
let insertPosition = 0;
if (frontmatter) {
    insertPosition += frontmatter.length;
}
if (h1Title) {
    // Find H1 title position after frontmatter
    const contentAfterFrontmatter = content.substring(frontmatter.length);
    const h1PositionInRemainder = contentAfterFrontmatter.search(/^#+\s+.*/m);
    if (h1PositionInRemainder !== -1) {
        const h1EndPosition = contentAfterFrontmatter.indexOf('\n', h1PositionInRemainder);
        insertPosition += (h1EndPosition !== -1 ? h1EndPosition + 1 : contentAfterFrontmatter.length);
    }
}

// Create new content with summary inserted at the right position
const beforeSummary = content.substring(0, insertPosition);
const afterSummary = content.substring(insertPosition);
const newContent = beforeSummary + summary + '\n' + afterSummary;

await tp.app.vault.modify(file, newContent);

new Notice(`Summarized '${file.path}'`, 5000);
_%>
