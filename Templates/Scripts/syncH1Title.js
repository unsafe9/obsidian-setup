async function syncH1Title(parser, fileName) {
  const currentTitle = parser.title;

  if (currentTitle !== fileName) {
    // Update the title to match the file name
    parser.setTitle(fileName);

    if (currentTitle) {
      new Notice(`Updated H1 title to match filename: ${fileName}`);
    } else {
      new Notice(`Created H1 title and synced with filename: ${fileName}`);
    }

    return true; // Indicates changes were made
  }

  return false; // No changes needed
}

module.exports = syncH1Title;
