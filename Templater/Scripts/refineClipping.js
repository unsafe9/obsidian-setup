async function refineClipping(tp, parser, threshold = 30000) {
  const file = parser.file;
  const content = parser.content;
  const charCount = content.length;
  const model = charCount > threshold ? "gemini-2.5-pro" : "gemini-2.5-flash";
  new Notice(`Cleaning up ${file.path} with ${model}...`, 5000);

  const prompt = `Process the web-clipped file (@${file.path}) according to the instructions below to refine and structure its content.

1. Core Content Extraction
   - Eliminate all non-essential elements, including advertisements, navigation menus, footers, and subjective opinions.
   - Carefully retain any information that provides value and context, such as important hyperlinks, illustrative examples, and relevant background details.

2. Markdown Formatting and Structure
   - Reformat the extracted content into a clean and logical Markdown document. Use structural elements like headers, lists, and blockquotes to improve readability.
   - Ensure all tables and code blocks are correctly formatted and rendered properly.
   - The main H1 title must be placed exactly two lines below the frontmatter section.

3. Metadata and Final Review
   - Analyze the article's content to infer and populate any empty frontmatter fields.
   - Standardize the 'published' and 'created' properties to the 'YYYY-MM-DDTHH:mm' format.
   - Compose a concise, single-sentence summary of the article for the 'description' field.`;

  const result = await tp.user.exec.geminiCli({
    prompt: prompt,
    model: model,
    yolo: true,
  });
  console.log("Refine Clipping:", result);

  new Notice(`Cleanup ${file.path} complete.`, 5000);
}

module.exports = refineClipping;
