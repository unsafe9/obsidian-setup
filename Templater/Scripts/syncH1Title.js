async function syncH1Title(parser) {
  const file = parser.file;
  const fileName = file.basename;
  const currentTitle = parser.title;

  // Skip if titles are effectively the same
  if (currentTitle === fileName) {
    return false; // No changes needed
  }

  try {
    // Update the title to match the file name
    parser.setTitle(fileName);

    if (currentTitle) {
      new Notice(`Updated H1 title to match filename: ${fileName}`);
    } else {
      new Notice(`Created H1 title and synced with filename: ${fileName}`);
    }

    return true;

  } catch (error) {
    console.error(`Error syncing H1 title for ${fileName}:`, error);
    new Notice(`Error syncing H1 title: ${error.message}`, 5000);
  }
}

module.exports = syncH1Title;
