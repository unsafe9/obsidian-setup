async function summarize(tp, filePath) {
  const prompt = `Summarize @${filePath} in a single comprehensive summary paragraph.
It must include all key arguments, main points, and conclusions from the original text.
Be careful not to lose any critical information.
Ignore the frontmatter and the first H1 title below the frontmatter if they exist, only summarize the content below.`;

  return await tp.user.cli(`gemini -m gemini-2.5-flash -p "${prompt}"`);
}

module.exports = summarize;
