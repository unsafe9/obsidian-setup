<%*
const parser = await tp.user.parseFile(tp, file);
const changed = await tp.user.renameImages(tp, parser, file.basename, true);
if (changed) {
  await parser.save();
}
_%>
