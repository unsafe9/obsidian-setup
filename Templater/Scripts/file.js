async function imageToBase64(path) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    throw new Error(`File not found: ${path}`);
  }

  const arrayBuffer = await app.vault.readBinary(file);
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;

  // const mimeType = `image/${file.extension}`;
  // const dataUri = `data:${mimeType};base64,${base64}`;
  // return dataUri;
}

async function readJson(path) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    throw new Error(`File not found: ${path}`);
  }
  const content = await app.vault.read(file);
  if (!content) {
    throw new Error(`File is empty: ${path}`);
  }
  return JSON.parse(content);
}

module.exports = {
  imageToBase64,
  readJson,
};
