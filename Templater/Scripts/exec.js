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

// interface AgentPrompt {
//   prompt: string;
//   yolo: boolean;
//   model: string;
// }

// interface ApiPrompt {
//   prompt: string;
//   model: string;
//   images?: string[];
//   format?: Object;
//   thinking: boolean;
// }

async function geminiCli(p) {
  if (!p.model) {
    p.model = 'gemini-2.5-flash';
  }

  return cli(`gemini -m "${p.model}" ${p.yolo ? '--yolo' : ''} -p "${p.prompt}"`);
}

async function gemini(tp, p) {
  if (!p.model) {
    p.model = 'gemini-2.5-flash-lite';
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text: p.prompt
          },
        ]
      }
    ]
  };

  if (p.images?.length > 0) {
    const base64Images = await Promise.all(p.images.map(image => tp.user.file.imageToBase64(image)));
    for (const image of base64Images) {
      body.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: image,
        },
      });
    }
  }

  if (!p.thinking) {
    body.generationConfig = {
      ...body.generationConfig,
      thinkingConfig: {
        thinkingBudget: 0
      }
    };
  }

  if (p.format) {
    body.generationConfig = {
      ...body.generationConfig,
      responseMimeType: 'application/json',
      responseSchema: p.format,
    };
  }

  const config = await tp.user.config.getConfig();
  const apiKey = config.ai.gemini_api_key;

  const response = await tp.obsidian.requestUrl({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const responseBody = response.json;
  if (response.status !== 200 || !responseBody) {
    throw new Error(`gemini error`, response);
  }

  console.log('gemini response:', response);

  const content = responseBody.candidates[0].content.parts[0].text;
  if (p.format) {
    return JSON.parse(content);
  }
  return content;
}

async function ollama(tp, p) {
  if (!p.model) {
    p.model = 'gemma3:12b';
  }

  const body = {
    model: p.model,
    prompt: p.prompt,
    stream: false,
  };

  if (p.images?.length > 0) {
    body.images = await Promise.all(p.images.map(image => tp.user.file.imageToBase64(image)));
  }

  if (p.format) {
    body.format = p.format;
  }

  const response = await tp.obsidian.requestUrl({
    url: 'http://localhost:11434/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseBody = response.json;
  if (response.status !== 200 || !responseBody || !responseBody.done) {
    throw new Error(`ollama error`, response);
  }

  console.log('ollama response:', response);

  if (p.format) {
    return JSON.parse(responseBody.response);
  }
  return responseBody.response?.trim();
}

module.exports = {
  cli,
  geminiCli,
  gemini,
  ollama,
};
