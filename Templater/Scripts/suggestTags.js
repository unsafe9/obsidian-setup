async function suggestTags(tp, file, useMetadataExtractor = true) {
  new Notice(`Analyzing tags for '${file.path}'...`, 5000);

  const prompt = `Analyze the content of @${file.path} and suggest appropriate tags based on the content.
${useMetadataExtractor ? `Look at existing tags in @.obsidian/plugins/metadata-extractor/tags.json for reference.` : ''}
Return only the tag names (without # symbols, without spaces) separated by commas.
Example format: technology,programming,javascript,web-development
Do not include any other text or explanation, just the comma-separated tag list.`;

  const res = await tp.user.cli(`gemini -m gemini-2.5-flash -p "${prompt}"`);
  console.log('Tag File raw response:', res);

  // Parse the response into an array of tags
  return res.trim().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

module.exports = suggestTags;
