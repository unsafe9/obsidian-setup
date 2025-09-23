/**
 * Edit selected text using AI with custom prompt, context preservation, and structured output
 * Uses the new unified AI interface with Gemini provider
 * @param {Object} tp - Templater object
 * @param {string} selectedText - The text to edit
 * @param {string} editPrompt - User's editing instruction
 * @param {string} sessionId - Optional session ID for context preservation (defaults to file path)
 * @returns {Promise<string>} - The edited text
 */
async function editText(tp, selectedText, editPrompt, sessionId = null) {
  new Notice(`Processing text with AI...`, 3000);

  // Generate session ID: use file path as default
  if (!sessionId) {
    sessionId = `text-editor-${tp.file.path(true) || 'unknown'}`;
  }

  try {
    const result = await tp.user.exec.ai(tp, {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      // provider: 'ollama',
      // model: 'gemma3:12b',
      sessionId: sessionId,
      prompt: editPrompt,
      thinking: false,
      systemInstruction: `You are a text editor AI.
Edit text according to user instructions and provide only the edited text.
Always consider our previous conversation history for context and consistency.

Original text to edit:
${selectedText}`,
      maxHistoryPairs: 3,
      format: {
        type: 'string',
        description: 'The edited version of the text',
      }
    });

    return result.trim();
  } catch (error) {
    console.error('AI text editing error:', error);
    new Notice('Error: Failed to edit text with AI', 5000);
    throw error;
  }
}

module.exports = editText;
