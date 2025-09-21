let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const file = app.vault.getAbstractFileByPath('config.json');
    if (!file) {
      throw new Error('config.json not found in vault root');
    }

    const content = await app.vault.read(file);
    cachedConfig = JSON.parse(content);
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load config.json:', error);
    throw error;
  }
}

async function getNotePaths() {
  return (await getConfig()).paths.note_directories;
}

async function getClippingPaths() {
  return (await getConfig()).paths.clipping_directories;
}

async function getDailyNotePaths() {
  return (await getConfig()).paths.daily_note_directories;
}

/**
 * Clear the cached configuration (useful for testing or config updates)
 */
function clearCache() {
  cachedConfig = null;
}

module.exports = {
  getConfig,
  getNotePaths,
  getClippingPaths,
  getDailyNotePaths,
  clearCache,
};
