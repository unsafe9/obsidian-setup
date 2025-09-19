async function syncH1Title(parser, fileName) {
  const currentTitle = parser.title;

  // Normalize titles for comparison (trim whitespace, handle empty strings)
  const normalizedCurrentTitle = (currentTitle || '').trim();
  const normalizedFileName = (fileName || '').trim();

  // Skip if titles are effectively the same
  if (normalizedCurrentTitle === normalizedFileName) {
    return false; // No changes needed
  }

  // Skip if filename is empty or invalid
  if (!normalizedFileName) {
    return false;
  }

  try {
    // Update the title to match the file name
    parser.setTitle(normalizedFileName);

    if (normalizedCurrentTitle) {
      new Notice(`Updated H1 title to match filename: ${normalizedFileName}`);
    } else {
      new Notice(`Created H1 title and synced with filename: ${normalizedFileName}`);
    }

    return true; // Indicates changes were made
  } catch (error) {
    console.error(`Error syncing H1 title for ${fileName}:`, error);
    new Notice(`Error syncing H1 title: ${error.message}`, 5000);
    return false;
  }
}

module.exports = syncH1Title;
