<%*
const file = tp.app.vault.getAbstractFileByPath(tp.file.path(true));
new Notice(`Summarizing '${file.path}'...`, 5000);
const summary = await tp.user.summarize(tp, file.path);

//const parser = await tp.user.parseFile(tp, file);
//parser.setContent(summary);
//await parser.save();

await tp.user.modal(tp, `Summary of '${file.basename}'`, '```markdown\n' + summary + '\n```');
_%>
