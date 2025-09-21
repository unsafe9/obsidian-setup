async function summarize(tp, text) {
  const prompt = `Summarize the following text in a single comprehensive summary paragraph.
It must include all key arguments, main points, and conclusions from the original text.
Be careful not to lose any critical information.
Ignore the frontmatter and the first H1 title below the frontmatter if they exist, only summarize the content below.

Text to summarize:
${text}`;

  return tp.user.exec.gemini(prompt);
}

module.exports = summarize;
