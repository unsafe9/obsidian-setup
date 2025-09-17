<%*
tp.app.vault.on('create', async file => {
  if (tp.user.path.inDir(file.path, ['Clippings'])) {
    await tp.user.refineClipping(tp, file);
  }
});

tp.app.vault.on('modify', async file => {
  if (tp.user.path.isNotePath(file.path)) {
    await Promise.all([
      tp.user.renameImagesInFile(tp, file, true),
      tp.user.syncH1Title(tp, file),
    ]);
  }
});

tp.app.vault.on('rename', async (file, oldPath) => {
  if (tp.user.path.isNotePath(file.path)) {
    await sleep(300); // Wait for the new file template to be applied
    await tp.user.syncH1Title(tp, file);
  }
});
_%>
