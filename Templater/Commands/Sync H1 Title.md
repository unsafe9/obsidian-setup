<%*
const parser = await tp.user.parseFile(tp);
const changed = await tp.user.syncH1Title(parser);
if (changed) {
  await parser.save();
}

return;
%>
