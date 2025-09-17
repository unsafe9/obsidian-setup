<%*
const parser = await tp.user.parseFile(tp, file);
const changed = await tp.user.syncH1Title(parser, file.basename);
if (changed) {
  await parser.save();
}
%>
