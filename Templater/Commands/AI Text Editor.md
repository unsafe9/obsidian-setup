<%*
// Get selected text
let selectedText = tp.file.selection().trimStart();
if (!selectedText?.trim()) {
  new Notice("Please select text to edit", 5000);
  return;
}

let finalAction = null; // 'replace', 'insert', or null

function createModalContent(originalText, editedText = null, status = null) {
  editedText = editedText || '';
  status = status || '';

  return `### Original Text
\`\`\`
${originalText}
\`\`\`

### Edited Text
\`\`\`
${editedText}
\`\`\`

${status}`;
}

let editedText = null;

// Generate session ID (maintain context per file)
const sessionId = tp.user.exec.uuid();

// Context info (session history is automatically managed by the AI interface)
const contextInfo = '\n**💡 AI will consider previous conversations (max 3)**';

// Initial content
const initialContent = createModalContent(selectedText, null, contextInfo);

// Show modal with input field and dynamic content
await tp.user.modal(tp, "", initialContent, [
  {
    text: "Replace",
    hotkey: "cmd+enter",
    callback: () => {
      if (!editedText) {
        new Notice("Please generate suggestions first by entering instructions and pressing Enter");
        return;
      }
      finalAction = 'replace';
      new Notice("Text will be replaced!");
    }
  },
  {
    text: "Insert Below",
    hotkey: "alt+enter",
    callback: () => {
      if (!editedText) {
        new Notice("Please generate suggestions first by entering instructions and pressing Enter");
        return;
      }
      finalAction = 'insert';
      new Notice("Text will be inserted below!");
    }
  }
], {
  inputField: {
    placeholder: "How would you like to edit this text? (e.g., 'make it more formal', 'fix grammar')",
    multiline: true,
    onEnter: async (prompt, modal) => {
      if (!prompt || prompt.trim() === "") {
        new Notice("Please enter editing instructions");
        return;
      }

      // Show loading state
      const loadingContent = createModalContent(
        selectedText,
        null,
        "**🤖 AI is processing your request...**"
      );
      modal.updateContent(loadingContent);

      try {
        // Get edited text from AI with session context
        editedText = await tp.user.editText(tp, selectedText, prompt, sessionId);

        // Update content with results
        const resultContent = createModalContent(selectedText, editedText);
        modal.updateContent(resultContent);
        new Notice("AI suggestions ready! Use Cmd+Enter to replace or Alt+Enter to insert below.");

      } catch (error) {
        const errorContent = createModalContent(
          selectedText,
          null,
          "**❌ Error: Failed to generate suggestions. Please try again.**"
        );
        modal.updateContent(errorContent);
      }
    }
  }
});

// Execute final action if user made a choice
if (finalAction === 'replace' && editedText) {
  tR = editedText;
  new Notice("Text replaced successfully!");
} else if (finalAction === 'insert' && editedText) {
  tR = selectedText + '\n' + editedText;
  new Notice("Text inserted below successfully!");
} else {
  return;
}
_%>
