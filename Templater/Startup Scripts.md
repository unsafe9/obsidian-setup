<%*
// Constants
const debounceDelay = 500;
const templateApplyDelay = 300;

tp.app.vault.on('create', async file => {
  const clippingPaths = await tp.user.config.getClippingPaths();
  if (tp.user.file.inDir(file.path, clippingPaths)) {
    await process(file, async parser => {
      await tp.user.refineClipping(tp, parser);
    });
  }
});

tp.app.vault.on('modify', async file => {
  const notePaths = await tp.user.config.getNotePaths();
  if (tp.user.file.inDir(file.path, notePaths)) {
    await process(file, async parser => {
      await tp.user.syncH1Title(parser);

      await parser.save(); // renaming images requires the file to be saved
      await tp.user.renameImages(tp, parser, true);
    });
  }
});

tp.app.vault.on('rename', async (file, oldPath) => {
  const notePaths = await tp.user.config.getNotePaths();
  if (tp.user.file.inDir(file.path, notePaths)) {
    await process(file, async parser => {
      await sleep(templateApplyDelay);
      await tp.user.syncH1Title(parser);
    });
  }
});

// Track files being processed to prevent infinite loops
const processingFiles = new Set();
const debounceTimers = new Map();

async function process(file, work) {
  if (processingFiles.has(file.path)) {
    return;
  }

  if (debounceTimers.has(file.path)) {
    clearTimeout(debounceTimers.get(file.path));
  }

  const timer = setTimeout(async () => {
    try {
      processingFiles.add(file.path);

      const parser = await tp.user.parseFile(tp, file);
      await work(parser);
      await parser.save();

    } finally {
      processingFiles.delete(file.path);
      debounceTimers.delete(file.path);
    }
  }, debounceDelay);

  debounceTimers.set(file.path, timer);
}
_%>
