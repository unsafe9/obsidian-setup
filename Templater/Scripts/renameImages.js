async function renameImages(tp, parser, useAI = false) {
  const file = parser.file;
  const imageLinkRegex = /!\[\[([^|\]]+?)]]/g;
  const pastedImageRegex = /Pasted image \d{14}\.(png|jpg|jpeg|gif|bmp|webp)/;

  const matches = [...parser.content.matchAll(imageLinkRegex)];
  const imagesToRename = [];

  for (const match of matches) {
    const linkText = match[1]; // text in [[...]]
    if (pastedImageRegex.test(linkText)) {
      const imageFile = tp.app.metadataCache.getFirstLinkpathDest(linkText, file.path);
      if (imageFile) {
        imagesToRename.push({
          oldLinkText: linkText,
          imageFile: imageFile,
        });
      }
    }
  }

  if (imagesToRename.length === 0) {
    return false; // No changes made
  }

  for (const item of imagesToRename) {
    const { oldLinkText, imageFile } = item;

    let newName = '';
    if (useAI) {
      new Notice(`Renaming '${imageFile.path}'...`, 5000);

      // const prompt = `Generate a filename for the image '@${imageFile.path}'. Use 3-8 English words in lowercase with underscores. Your response must contain ONLY the filename itself without extension, with no explanation or other text.`;
      // newName = await tp.user.exec.geminiCli(prompt);

      const prompt = `Use 3-8 English words in lowercase with underscores. Your response must contain ONLY the filename itself without extension, with no explanation or other text.`;
      newName = await tp.user.exec.ollama(tp, prompt, 'gemma3:12b', [imageFile.path]);
      if (!newName || newName.trim() === '') {
        console.warn(`AI failed to provide a name for ${imageFile.path}`);
        continue;
      }
    } else {
      newName = parser.title.replaceAll(' ', '_');
    }

    // sanitize the output
    newName = newName.trim().replace(/["*?!,'`]/g, '').replace(/\s+/g, '_').toLowerCase();

    const newFilePath = imageFile.path.replace('Pasted image ', newName + '_');

    await tp.app.fileManager.renameFile(imageFile, newFilePath);
    new Notice(`Image renamed to '${newFilePath}'`);
  }

  return imagesToRename.length > 0; // Return true if any images were renamed
}

module.exports = renameImages;
