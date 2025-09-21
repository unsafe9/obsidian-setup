const util = require('util');
const os = require('os');
const exec = util.promisify(require('child_process').exec);

/**
 * Executes a shell command and returns it as a Promise.
 * @param command
 * @returns {Promise<unknown>}
 */
async function cli(command) {
  const isUnix = os.platform() !== 'win32';
  let executionCommand = command;

  if (isUnix) {
    const shell = process.env.SHELL;
    if (!shell) {
      throw new Error("Could not determine user's shell (SHELL environment variable is not set).");
    }

    // TODO: It needs a better escaping mechanism, but just be careful when calling this function for now.
    const escapedCommand = command.replace(/"/g, '\\"');

    // Use login shell to ensure the correct environment variables are set.
    // This might have unexpected security implications.
    executionCommand = `${shell} -l -c "${escapedCommand}"`;
  }

  try {
    const { stdout, stderr } = await exec(executionCommand, {
      cwd: app.vault.adapter.basePath,
    });
    if (stderr) {
      console.warn(`cli stderr: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`cli failed: command="${command}", err="${error}"`);
    throw error;
  }
}

async function gemini(prompt, yolo = false, model = 'gemini-2.5-flash') {
  return cli(`gemini -m "${model}" ${yolo ? '--yolo' : ''} -p "${prompt}"`);
}

async function ollama(tp, prompt, model = 'gemma3:12b', images = undefined, format = undefined) {
  let base64Images = undefined;
  if (images?.length > 0) {
    base64Images = await Promise.all(images.map(image => tp.user.file.imageToBase64(image)));
  }

  const response = await tp.obsidian.requestUrl({
    url: 'http://localhost:11434/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      images: base64Images,
      format: format,
    }),
  });
  const responseBody = response.json;
  if (response.status !== 200 || !responseBody || !responseBody.done) {
    console.error(`ollama error`, response);
  } else {
    console.log('ollama response:', response);
  }

  return responseBody.response?.trim();
}

module.exports = {
  cli,
  gemini,
  ollama,
};
