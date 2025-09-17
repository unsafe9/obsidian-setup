<%*
const file = tp.app.vault.getAbstractFileByPath(tp.file.path(true));
const parser = await tp.user.parseFile(tp, file);
new Notice(`Summarizing '${file.path}'...`, 5000);
const summary = await tp.user.summarize(tp, parser.content);

await tp.user.modal(tp, `Summary of '${file.basename}'`, '```markdown\n' + summary + '\n```');
_%>
