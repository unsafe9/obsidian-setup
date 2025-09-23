async function relocateNewNote(tp, file, inheritTags = true) {
  let title = file.basename;
  let tags = [];

  // Find the source file that has a backlink to this note and was opened very recently.
  let sourceFile = null;
  const backlinks = tp.app.metadataCache.getBacklinksForFile(file);
  if (backlinks.data.size > 0) {
    const recentFiles = tp.app.workspace.recentFileTracker.lastOpenFiles;
    const sourcePath = recentFiles.find(path => backlinks.data.has(path));
    if (sourcePath) {
      sourceFile = tp.app.vault.getAbstractFileByPath(sourcePath);
    }
  }

  if (sourceFile) {
    // Created via a wiki link
    const targetFolder = sourceFile.parent;
    const targetPath = app.vault.adapter.path.join(targetFolder.path, title);

    if (file.path !== targetPath) {
      await tp.file.move(targetPath);
      new Notice(`Note has moved to ${targetFolder.path}.`, 5000);
    }

    // Inherit tags
    if (inheritTags) {
      tags = tp.app.metadataCache.getFileCache(sourceFile)?.frontmatter?.tags?.map(t => t.startsWith('#') ? t.slice(1) : t) || [];
    }

  } else if (title.startsWith("Untitled")) {
    const chosenPath = await tp.user.file.directorySuggester(tp, "Select destination folder...", true);
    if (!chosenPath) {
      await tp.app.vault.trash(file, true);
      return;
    }

    // Created via the new note action without title
    while (true) {
      title = await tp.system.prompt("File name: ");
      if (!title) {
        await tp.app.vault.trash(file, true);
        return;
      }

      // Extract title and tags from the text
      const match = title.match(/^(.*?)\s*#(.+)/s);
      title = (match ? match[1] : title).trim();
      tags = match ? match[2].split('#').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      try {
        await tp.file.move(app.vault.adapter.path.join(chosenPath, title));
      } catch (e) {
        new Notice(e, 5000);
        continue
      }
      break;
    }
  }

  return {
    title,
    tags,
  };
}

module.exports = relocateNewNote;
