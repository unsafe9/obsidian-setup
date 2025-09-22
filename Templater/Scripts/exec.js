const util = require('util');
const os = require('os');
const exec = util.promisify(require('child_process').exec);
const crypto = require('crypto');

// Constants
const PROMPT_PREVIEW_LENGTH = 100;
const DEFAULT_IMAGE_MIME_TYPE = 'image/png';

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

function uuid() {
  return crypto.randomUUID();
}

// Base adapter class for AI providers
class BaseAIAdapter {
  constructor(tp, options = {}) {
    this.tp = tp;
    this.model = options.model;
    this.systemInstruction = options.systemInstruction;
    this.thinking = options.thinking !== false;
  }

  async generateContent(prompt, options = {}) {
    throw new Error('generateContent must be implemented by subclass');
  }

  async processImages(images) {
    if (!images?.length) return [];
    return await Promise.all(images.map(image => this.tp.user.file.imageToBase64(image)));
  }

  formatMessage(role, text, images = []) {
    // Base implementation - to be overridden by subclasses
    return { role, text, images };
  }

  formatHistoryForAPI(history) {
    // Base implementation - convert generic format to adapter-specific format
    return history.map(msg => this.formatMessage(msg.role, msg.text, msg.images));
  }

}

// Gemini adapter
class GeminiAdapter extends BaseAIAdapter {
  constructor(tp, options = {}) {
    super(tp, options);
    this.model = this.model || 'gemini-2.5-flash-lite';
  }

  formatMessage(role, text, images = []) {
    const parts = [{ text }];

    if (images?.length > 0) {
      for (const image of images) {
        parts.push({
          inline_data: {
            mime_type: DEFAULT_IMAGE_MIME_TYPE,
            data: image,
          },
        });
      }
    }

    return { role, parts };
  }

  _buildGenerationConfig(options) {
    const config = {};

    const thinking = options.thinking !== undefined ? options.thinking : this.thinking;
    if (!thinking) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    if (options.format) {
      config.responseMimeType = 'application/json';
      config.responseSchema = options.format;
    }

    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    // Add other generation config options
    if (options.options) {
      Object.assign(config, options.options);
    }

    return config;
  }

  _getSystemInstruction(options) {
    return this.systemInstruction || options.systemInstruction;
  }



  async generateContent(prompt, options = {}) {
    const body = {};

    // Add system instruction
    const systemInstruction = this._getSystemInstruction(options);
    if (systemInstruction) {
      body.system_instruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Process images
    let imageParts = [];
    if (options.images?.length > 0) {
      const base64Images = await this.processImages(options.images);
      imageParts = base64Images.map(image => ({
        inline_data: {
          mime_type: DEFAULT_IMAGE_MIME_TYPE,
          data: image,
        },
      }));
    }

    // Configure contents - include history if available
    if (options.history && options.history.length > 0) {
      body.contents = [...options.history];
      body.contents.push({
        role: 'user',
        parts: [{ text: prompt }, ...imageParts]
      });
    } else {
      body.contents = [{
        role: 'user',
        parts: [{ text: prompt }, ...imageParts]
      }];
    }

    // Configure generation settings
    body.generationConfig = this._buildGenerationConfig(options);

    const config = await this.tp.user.config.getConfig();
    const apiKey = config.ai.gemini_api_key;

    const response = await this.tp.obsidian.requestUrl({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200 || !response.json) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    console.log('gemini response:', response);

    const content = response.json.candidates[0].content.parts[0].text;
    return options.format ? JSON.parse(content) : content;
  }
}

// Ollama adapter
class OllamaAdapter extends BaseAIAdapter {
  constructor(tp, options = {}) {
    super(tp, options);
    this.model = this.model || 'gemma3:12b';
  }

  formatMessage(role, text, images = []) {
    // Ollama uses simple text content with separate images array
    const message = {
      role: role === 'model' ? 'assistant' : role,
      content: text
    };

    if (images?.length > 0) {
      message.images = images;
    }

    return message;
  }



  async generateContent(prompt, options = {}) {
    // Use chat API if history is provided, otherwise use generate API for efficiency
    const useChat = options.history && options.history.length > 0;

    if (useChat) {
      return await this._generateWithChat(prompt, options);
    } else {
      return await this._generateWithGenerate(prompt, options);
    }
  }

  _buildOllamaOptions(options) {
    const result = {};
    if (options.temperature !== undefined || options.options) {
      result.options = {
        temperature: options.temperature,
        ...options.options
      };
    }
    return result;
  }

  _getSystemInstruction(options) {
    return this.systemInstruction || options.systemInstruction;
  }

  async _generateWithChat(prompt, options = {}) {
    const messages = [];

    // Add system message if provided
    const systemInstruction = this._getSystemInstruction(options);
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction
      });
    }

    // Add history messages using adapter's format
    if (options.history && options.history.length > 0) {
      const formattedHistory = this.formatHistoryForAPI(options.history);
      messages.push(...formattedHistory);
    }

    // Add current message using adapter's format
    const base64Images = options.images?.length > 0 ? await this.processImages(options.images) : [];
    const userMessage = this.formatMessage('user', prompt, base64Images);
    messages.push(userMessage);

    const body = {
      model: this.model,
      messages: messages,
      stream: false,
    };

    // Add advanced options
    Object.assign(body, this._buildOllamaOptions(options));

    // Handle structured output
    if (options.format) {
      body.format = options.format;
    }

    const response = await this.tp.obsidian.requestUrl({
      url: 'http://localhost:11434/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200 || !response.json) {
      throw new Error(`Ollama Chat API error: ${response.status} - ${response.text || 'Unknown error'}`);
    }

    console.log('ollama chat response:', response);

    const content = response.json.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    return options.format ? this._parseStructuredOutput(content, options.format) : content;
  }

  async _generateWithGenerate(prompt, options = {}) {
    let fullPrompt = prompt;

    // Add system instruction to prompt if provided
    const systemInstruction = this._getSystemInstruction(options);
    if (systemInstruction) {
      fullPrompt = `${systemInstruction}\n\n${prompt}`;
    }

    const body = {
      model: this.model,
      prompt: fullPrompt,
      stream: false,
    };

    // Add images
    if (options.images?.length > 0) {
      body.images = await this.processImages(options.images);
    }

    // Add advanced options
    Object.assign(body, this._buildOllamaOptions(options));

    // Handle structured output
    if (options.format) {
      body.format = options.format;
    }

    // Add system message
    if (systemInstruction) {
      body.system = systemInstruction;
    }

    const response = await this.tp.obsidian.requestUrl({
      url: 'http://localhost:11434/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200 || !response.json || !response.json.done) {
      throw new Error(`Ollama Generate API error: ${response.status} - ${response.text || 'Unknown error'}`);
    }

    console.log('ollama generate response:', response);

    const content = response.json.response?.trim();
    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    return options.format ? this._parseStructuredOutput(content, options.format) : content;
  }

  _parseStructuredOutput(content, format) {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse structured output from Ollama:', error);
      console.warn('Raw content:', content);
      // Try to extract JSON from the content if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn('Failed to parse extracted JSON:', e);
        }
      }
      throw new Error(`Failed to parse structured output: ${error.message}`);
    }
  }
}

// Universal chat session class
class ChatSession {
  constructor(tp, provider, options = {}) {
    this.tp = tp;
    this.provider = provider;
    this.model = options.model;
    this.systemInstruction = options.systemInstruction;
    this.thinking = options.thinking !== false;
    this.history = [];
    this.maxHistoryPairs = options.maxHistoryPairs || 10;

    // Create appropriate adapter using common factory function
    this.adapter = createAdapter(provider, this.tp, options);
  }

  async sendMessage(prompt, options = {}) {
    const messageOptions = {
      ...options,
      history: this.history,
      systemInstruction: this.systemInstruction,
      thinking: this.thinking,
    };

    const response = await this.adapter.generateContent(prompt, messageOptions);

    // Add user message to history in generic format
    const base64Images = options.images?.length > 0 ? await this.adapter.processImages(options.images) : [];
    const userMessage = {
      role: 'user',
      text: prompt,
      images: base64Images
    };
    this.history.push(userMessage);

    // Add model response to history in generic format
    const modelMessage = {
      role: 'model',
      text: response,
      images: []
    };
    this.history.push(modelMessage);

    // Limit history length
    this._trimHistory();

    return response;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  setSystemInstruction(instruction) {
    this.systemInstruction = instruction;
    this.adapter.systemInstruction = instruction;
  }

  _trimHistory() {
    if (this.history.length > this.maxHistoryPairs * 2) {
      const excessPairs = Math.floor(this.history.length / 2) - this.maxHistoryPairs;
      this.history.splice(0, excessPairs * 2);
    }
  }
}

// Enhanced session manager
class ChatSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(sessionId, tp, provider, options = {}) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new ChatSession(tp, provider, options));
    }
    return this.sessions.get(sessionId);
  }

  clearSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.get(sessionId).clearHistory();
    }
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.keys());
  }
}

// Global session manager instance
const globalSessionManager = new ChatSessionManager();

// Common adapter factory function
function createAdapter(provider, tp, options = {}) {
  switch (provider.toLowerCase()) {
    case 'gemini':
      return new GeminiAdapter(tp, options);
    case 'ollama':
      return new OllamaAdapter(tp, options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function getOrCreateChatSession(sessionId, tp, provider, options = {}) {
  return globalSessionManager.getSession(sessionId, tp, provider, options);
}


// Legacy CLI function for gemini (kept for backward compatibility)
async function geminiCli(p) {
  if (!p.model) {
    p.model = 'gemini-2.5-flash';
  }

  return cli(`gemini -m "${p.model}" ${p.yolo ? '--yolo' : ''} -p "${p.prompt}"`);
}

/**
 * Universal AI function - supports both single calls and chat sessions
 * @param {Object} tp - Templater object
 * @param {Object} options - Configuration options
 * @param {string} options.provider - AI provider ('gemini' or 'ollama')
 * @param {string} options.prompt - The prompt to send
 * @param {string} [options.model] - Model to use
 * @param {string[]} [options.images] - Array of image paths
 * @param {Object} [options.format] - JSON schema for structured output
 * @param {boolean} [options.thinking] - Enable thinking mode (default: true, Gemini only)
 * @param {string} [options.systemInstruction] - System instruction
 * @param {string} [options.sessionId] - Session ID for chat continuation
 * @param {number} [options.maxHistoryPairs] - Max conversation pairs to keep
 * @param {number} [options.temperature] - Sampling temperature (0.0-1.0)
 * @param {Object} [options.options] - Additional model-specific options
 * @returns {Promise<string|Object>} Response from AI
 */
async function ai(tp, options) {
  const {
    provider,
    prompt,
    sessionId,
    ...adapterOptions
  } = options;

  if (!provider) {
    throw new Error('Provider is required (gemini or ollama)');
  }

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  // Log AI request
  const promptPreview = prompt.length > PROMPT_PREVIEW_LENGTH ? prompt.substring(0, PROMPT_PREVIEW_LENGTH) + '...' : prompt;

  // If sessionId is provided, use chat session
  if (sessionId) {
    const session = await getOrCreateChatSession(sessionId, tp, provider, adapterOptions);
    const history = session.getHistory();

    console.log(`🤖 AI Request [${provider}] Session: ${sessionId} | Prompt: "${promptPreview}" | History:`, history);

    return await session.sendMessage(prompt, adapterOptions);
  }

  // Otherwise, create a temporary adapter for single call
  console.log(`🤖 AI Request [${provider}] Single call | No session | Prompt: "${promptPreview}"`);

  const adapter = createAdapter(provider, tp, adapterOptions);
  return await adapter.generateContent(prompt, adapterOptions);
}

// Legacy functions for backward compatibility
async function gemini(tp, p) {
  return await ai(tp, {
    provider: 'gemini',
    model: p.model || 'gemini-2.5-flash-lite',
    ...p,
  });
}

async function ollama(tp, p) {
  return await ai(tp, {
    provider: 'ollama',
    model: p.model || 'gemma3:12b',
    ...p,
  });
}

module.exports = {
  cli,
  uuid,
  geminiCli,
  ai,
  gemini,
  ollama,
  getOrCreateChatSession,
};
