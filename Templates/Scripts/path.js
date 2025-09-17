const path = require('path');

// TODO: make this configurable
const notePaths = ['Notes', 'Archives', 'Daily Notes'];

/**
 * Checks if a given path is within any of the specified parent directories.
 * @param {string} p The path to check.
 * @param {string[]} dirs An array of parent directory paths.
 * @returns {boolean} True if the path is in one of the directories.
 */
function inDir(p, dirs) {
  return dirs.some(dir => {
    const relative = path.relative(dir, p);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

function isNotePath(p) {
  return inDir(p, notePaths);
}

function getNotePaths() {
  return notePaths;
}

function join(...paths) {
  return path.join(...paths);
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
  const defaultFolder = tp.user.path.getNotePaths()[0];
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
  inDir,
  isNotePath,
  getNotePaths,
  join,
  directorySuggester,
};
