<%*
const file = tp.app.vault.getAbstractFileByPath(tp.file.path(true));

// Get suggested tags from the AI
const suggestedTags = await tp.user.suggestTags(tp, file, false);
if (!suggestedTags?.length) {
  return;
}

await tp.app.fileManager.processFrontMatter(file, (frontmatter) => {
  let existingTags = frontmatter?.tags || [];
  const allTags = [...new Set([...existingTags, ...suggestedTags])].filter(tag => tag);

  frontmatter.tags = allTags;
});
_%>
