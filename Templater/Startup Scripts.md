<%*
// Track files being processed to prevent infinite loops
const processingFiles = new Set();
const debounceTimers = new Map();

tp.app.vault.on('create', async file => {
  if (tp.user.path.inDir(file.path, tp.user.path.getClippingPaths())) {
    await tp.user.refineClipping(tp, file);
  }
});

tp.app.vault.on('modify', async file => {
  if (tp.user.path.isNotePath(file.path)) {
    // Skip if this file is currently being processed by our script
    if (processingFiles.has(file.path)) {
      return;
    }

    // Clear existing debounce timer for this file
    if (debounceTimers.has(file.path)) {
      clearTimeout(debounceTimers.get(file.path));
    }

    // Set up debounce timer to handle rapid successive changes
    const timer = setTimeout(async () => {
      try {
        // Mark file as being processed
        processingFiles.add(file.path);

        const parser = await tp.user.parseFile(tp, file);

        let changed = await tp.user.syncH1Title(parser, file.basename);
        if (changed) {
          await parser.save();
        }

        await tp.user.renameImages(tp, parser, file.basename, true);
      } finally {
        // Remove from processing set
        processingFiles.delete(file.path);
        debounceTimers.delete(file.path);
      }
    }, 500); // 500ms debounce delay

    debounceTimers.set(file.path, timer);
  }
});

tp.app.vault.on('rename', async (file, oldPath) => {
  if (tp.user.path.isNotePath(file.path)) {
    // Skip if this file is currently being processed
    if (processingFiles.has(file.path)) {
      return;
    }

    try {
      // Mark file as being processed
      processingFiles.add(file.path);

      await sleep(300); // Wait for the new file template to be applied

      const parser = await tp.user.parseFile(tp, file);
      const changed = await tp.user.syncH1Title(parser, file.basename);
      if (changed) {
        await parser.save();
      }
    } finally {
      // Remove from processing set
      processingFiles.delete(file.path);
    }
  }
});
_%>
