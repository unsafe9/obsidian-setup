<%*
const parser = await tp.user.parseFile(tp);
const file = parser.file;
new Notice(`Summarizing '${file.path}'...`, 5000);
const summary = await tp.user.summarize(tp, parser.content);

await tp.user.modal(tp, `Summary of '${file.basename}'`, '```markdown\n' + summary + '\n```', [
  {
    text: "Copy",
    hotkey: "cmd+enter",
    callback: () => {
      navigator.clipboard.writeText(summary);
      new Notice("Summary copied to clipboard!");
    }
  }
]);

return;
_%>
