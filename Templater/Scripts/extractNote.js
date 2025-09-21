async function extractNote(tp) {
  // Get the current text selection
  let selection = tp.file.selection().trimStart();
  if (!selection) {
    new Notice("Please select text first.");
    return;
  }

  // Derive the title from the first line if it's a heading, otherwise prompt the user
  const headingMatch = selection.match(/^#+\s+(.*)/);
  let newTitle;
  if (headingMatch && headingMatch[1]) {
    newTitle = headingMatch[1].trim();
    selection = selection.replace(headingMatch[0], '').trimStart();
  } else {
    newTitle = await tp.system.prompt("Enter the title for the new note");
    if (!newTitle) {
      return;
    }
  }

  // Prompt for the destination folder
  const chosenPath = await tp.user.file.directorySuggester(tp, "Select destination folder...", false);
  if (!chosenPath) {
    return;
  }

  // Inherit tags from the source note's frontmatter.
  const activeFile = tp.file.find_tfile(tp.file.path(true));
  const tags = tp.app.metadataCache.getFileCache(activeFile)?.frontmatter?.tags?.map(t => t.startsWith('#') ? t.slice(1) : t) || [];

  // Generate the full content of new note
  const content = `---
tags: [${tags}]
created: ${tp.date.now("YYYY-MM-DD[T]HH:mm")}
# source: "[[${tp.file.title}]]"
---

# ${newTitle}

${selection}
`;

  // Create the new note
  await tp.file.create_new(content, newTitle, false, chosenPath);

  // Replace the original selection with a link to the new note
  tp.app.workspace.activeLeaf.view.editor.replaceSelection(`[[${newTitle}]]`);

  new Notice(`Note "${newTitle}" has been created in "${chosenPath}".`);
}

module.exports = extractNote;
