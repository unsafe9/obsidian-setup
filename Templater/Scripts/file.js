const path = require('path');

async function imageToBase64(imagePath) {
  const file = app.vault.getAbstractFileByPath(imagePath);
  if (!file) {
    throw new Error(`File not found: ${imagePath}`);
  }

  const arrayBuffer = await app.vault.readBinary(file);
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;

  // const mimeType = `image/${file.extension}`;
  // const dataUri = `data:${mimeType};base64,${base64}`;
  // return dataUri;
}

async function readJson(jsonPath) {
  const file = app.vault.getAbstractFileByPath(jsonPath);
  if (!file) {
    throw new Error(`File not found: ${jsonPath}`);
  }
  const content = await app.vault.read(file);
  if (!content) {
    throw new Error(`File is empty: ${jsonPath}`);
  }
  return JSON.parse(content);
}

function inDir(p, dirs) {
  return dirs.some(dir => {
    const relative = path.relative(dir, p);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

function getLastOpenFileOfNewNote(tp) {
  // For new notes, the left of the active file is the current note
  const activeFile = tp.app.workspace.getActiveFile();
  const openFiles = tp.app.workspace.getLeavesOfType('markdown').map(leaf => leaf.view.file);
  const currentFileIndex = openFiles.findIndex(note => note.path === activeFile.path);
  if (currentFileIndex > 0) {
    return openFiles[currentFileIndex - 1];
  }
  return null;
}

async function directorySuggester(tp, title, isNewNote = false) {
  const notePaths = await tp.user.config.getNotePaths();
  const defaultFolder = notePaths[0];
  let options = [defaultFolder];
  let displayOptions = [`➡️ ${defaultFolder} (Default Folder)`];

  // The left of the active file is the current note
  let currentFolder;
  if (isNewNote) {
    currentFolder = getLastOpenFileOfNewNote(tp)?.parent?.path;
  } else {
    currentFolder = tp.app.workspace.getActiveFile()?.parent?.path;
  }
  if (currentFolder) {
    if (currentFolder === defaultFolder) {
      currentFolder = null;
    } else {
      options.push(currentFolder);
      displayOptions.push(`➡️ ${currentFolder} (Current Folder)`);
    }
  }

  const allFolderPaths = tp.app.vault.getAllFolders(true)
    .filter(folder => folder.path !== defaultFolder && folder.path !== currentFolder)
    .map(folder => folder.path);

  options.push(...allFolderPaths);
  displayOptions.push(...allFolderPaths);

  return tp.system.suggester(displayOptions, options, false, title);
}

module.exports = {
  imageToBase64,
  readJson,
  inDir,
  getLastOpenFileOfNewNote,
  directorySuggester,
};
