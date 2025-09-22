<%*
const parser = await tp.user.parseFile(tp);
const file = parser.file;
const content = parser.reassemble(false);

// Get suggested tags from the AI
const suggestedTags = await tp.user.suggestTags(tp, content, false);
if (!suggestedTags?.length) {
  return;
}

await tp.app.fileManager.processFrontMatter(file, (frontmatter) => {
  let existingTags = frontmatter?.tags || [];
  const allTags = [...new Set([...existingTags, ...suggestedTags])].filter(tag => tag);

  frontmatter.tags = allTags;
});

return;
_%>
