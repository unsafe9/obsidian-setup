<%*
tp.app.vault.on('create', async file => {
  if (tp.user.path.inDir(file.path, ['Clippings'])) {
    await tp.user.refineClipping(tp, file);
  }
});

tp.app.vault.on('modify', async file => {
  if (tp.user.path.isNotePath(file.path)) {
    const parser = await tp.user.parseFile(tp, file);

    let changed = await tp.user.syncH1Title(parser, file.basename);
    if (changed) {
      await parser.save();
    }

    await tp.user.renameImages(tp, parser, file.basename, true);
  }
});

tp.app.vault.on('rename', async (file, oldPath) => {
  if (tp.user.path.isNotePath(file.path)) {
    await sleep(300); // Wait for the new file template to be applied

    const parser = await tp.user.parseFile(tp, file);
    const changed = await tp.user.syncH1Title(parser, file.basename);
    if (changed) {
      await parser.save();
    }
  }
});
_%>
