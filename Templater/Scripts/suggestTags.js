async function suggestTags(tp, content, suggestNewTags = true) {
  new Notice(`Analyzing tags...`, 5000);

  const tags = Object.keys(app.metadataCache.getTags()).map(tag => tag.slice(1));

  const prompt = `Suggest a few tags that are really appropriate for the following content.
Use existing tags ${suggestNewTags ? 'as much as possible, and add new tags when there are really no applicable options.' : 'only.'}
Existing tags: ${tags.join(',')}
Content: ${content}`;

  const res = await tp.user.exec.gemini(tp, {
    prompt: prompt,
    format: {
      type: 'array',
      description: 'The suggested tags.',
      items: {
        type: 'string',
        enum: !suggestNewTags ? tags : undefined,
      },
    },
  });
  console.log('suggestTags raw response:', res);

  return res;
}

module.exports = suggestTags;
