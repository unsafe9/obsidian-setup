async function renameImagesInFile(tp, file, useAI = false) {
  const originalContent = await tp.app.vault.read(file);
  let newContent = originalContent;

  const imageLinkRegex = /!\[\[([^|\]]+?)]]/g;
  const pastedImageRegex = /Pasted image \d{14}\.(png|jpg|jpeg|gif|bmp|webp)/;

  const matches = [...originalContent.matchAll(imageLinkRegex)];
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
    return;
  }

  for (const item of imagesToRename) {
    const { oldLinkText, imageFile } = item;

    let newName = '';
    if (useAI) {
      new Notice(`Renaming '${imageFile.path}'...`, 5000);

      const prompt = `Generate a filename for the image '@${imageFile.path}'.
Use 3-8 English words with underscores.
Your response must contain ONLY the filename itself without extension, with no explanation or other text.`;

      newName = await tp.user.cli(`gemini -m gemini-2.5-flash -p "${prompt}"`);
      if (!aiName || aiName.trim() === '') {
        console.warn(`AI failed to provide a name for ${imageFile.path}`);
        continue;
      }
    } else {
      newName = file.basename.replaceAll(' ', '_');
    }

    // sanitize the output
    newName = newName.trim().replace(/["*?!,'`]/g, '').replace(/\s+/g, '_').toLowerCase();

    const newFilePath = imageFile.path.replace('Pasted image ', newName + '_');

    await tp.app.fileManager.renameFile(imageFile, newFilePath);
    new Notice(`Renamed '${imageFile.path}' to '${newFilePath}'`);
  }
}

module.exports = renameImagesInFile;
