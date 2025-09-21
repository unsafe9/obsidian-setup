async function refineClipping(tp, parser, threshold = 15000) {
  const file = parser.file;
  const content = parser.content;
  const charCount = content.length;
  const model = charCount > threshold ? "gemini-2.5-pro" : "gemini-2.5-flash";
  new Notice(`Cleaning up ${file.path} with ${model}...`, 5000);

  const prompt = `Modify the web-clipped file @${file.path}.
Clean up the content by removing all irrelevant information such as ads, boilerplate text, personal opinions, and unnecessary introductions, refining it to the core message.
However, preserve any important links, meaningful asides, related examples, or contextual background that adds value, even if it deviates slightly from the main topic.
Distinguish between valuable tangents and irrelevant filler.
Format the final output in clean, readable Markdown, using headings, lists, and more where appropriate. Fix broken tables and code blocks.
Keep the H1 title two lines below the frontmatter.
Then, populate any empty frontmatter properties with details that can be inferred from the text.
Use 'YYYY-MM-DDTHH:mm' format for 'published' and 'created' properties.
Finally, replace 'description' property with a single-sentence summary of the content.`;

  const result = await tp.user.exec.geminiCli(prompt, true, model);
  console.log("Refine Clipping:", result);

  new Notice(`Cleanup ${file.path} complete.`, 5000);
}

module.exports = refineClipping;
