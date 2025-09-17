async function syncH1Title(tp, file) {
  const content = await tp.app.vault.read(file);
  const fileName = file.basename;

  // Locate the frontmatter
  const fmRegex = /^---\s*[\s\S]*?\s*---\s*/;
  const fmMatch = content.match(fmRegex);

  // Use content after frontmatter if available, otherwise use the full content
  const contentAfterFm = fmMatch ? content.substring(fmMatch[0].length) : content;

  // Locate the first H1 in the content
  const h1Regex = /^\s*# (.*)/m;
  const h1Match = contentAfterFm.match(h1Regex);

  if (h1Match) {
    // Update the H1 to match the file name if it already exists
    const currentH1Title = h1Match[1].trim();

    if (fileName !== currentH1Title) {
      const newH1Line = `# ${fileName}`;

      const newBody = contentAfterFm.replace(h1Regex, newH1Line);
      const frontmatter = fmMatch ? fmMatch[0] : '';
      const newContent = frontmatter + newBody;

      await tp.app.vault.modify(file, newContent);

      new Notice(`Updated H1 title to match filename: ${fileName}`);
    }
  } else {
    // Insert a new H1 if it none exist
    let newContent;
    const h1Block = `# ${fileName}`;

    if (fmMatch) {
      // Insert H1 two lines below the frontmatter if present
      const frontmatter = fmMatch[0];
      const body = content.substring(frontmatter.length).trim();
      newContent = frontmatter.trimEnd() + `\n\n` + h1Block;
      if (body) {
        newContent += `\n\n` + body;
      } else {
        newContent += `\n`;
      }
    } else {
      // Place H1 at the top if no frontmatter is found
      const body = content.trim();
      newContent = h1Block;
      if (body) {
        newContent += `\n\n` + body;
      } else {
        newContent += `\n`;
      }
    }

    await tp.app.vault.modify(file, newContent);

    new Notice(`Created H1 title and synced with filename: ${fileName}`);
  }
}

module.exports = syncH1Title;
