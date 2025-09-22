/**
 * Show a modal with the given title and content.
 * @param {string} title - The title of the modal.
 * @param {string} content - The content of the modal. It supports markdown.
 * @param {Array} buttons - Optional array of button objects with {text, callback, hotkey} properties.
 *   - text: Button text
 *   - callback: Function to call when clicked
 *   - closeModal: Whether to close modal after click (default: true)
 *   - hotkey: Keyboard shortcut (e.g., "cmd+enter", "escape", "enter")
 * @param {Object} options - Optional configuration object
 *   - inputField: {placeholder, value, onEnter, multiline} - Add text input field
 *     - multiline: true for textarea, false for input (default: false)
 * @returns {Promise} Promise that resolves when the modal is closed.
 */
function modal(tp, title, content, buttons = [], options = {}) {
  class InfoModal extends tp.obsidian.Modal {
    constructor(title, content, buttons, options, resolve) {
      super(app);
      if (title) {
        content = `# ${title}\n\n${content}`;
      }
      this.content = content;
      this.buttons = buttons;
      this.options = options;
      this.component = new tp.obsidian.Component();
      this.resolve = resolve;
      this.keyHandler = null;
      this.inputField = null;
    }

    onOpen() {
      const { contentEl } = this;

      contentEl.empty();

      // Increase modal width on desktop (non-mobile devices)
      if (!app.isMobile) {
        this.modalEl.style.cssText = `
          max-width: 60vw !important;
          width: 60vw !important;
        `;

        // Ensure content container doesn't overflow
        contentEl.style.cssText = `
          max-width: 100% !important;
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        `;
      }

      // Render content
      const contentDiv = contentEl.createDiv({ cls: 'modal-content-div' });
      this.renderAndStyleContent(this.content, contentDiv);

      // Add input field if specified
      if (this.options.inputField) {
        const inputContainer = contentEl.createDiv({
          cls: 'modal-input-container'
        });
        inputContainer.style.cssText = `
          margin: 20px 0;
          padding: 15px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          background: var(--background-primary);
        `;

        const isMultiline = this.options.inputField.multiline === true;

        // Create input field (textarea or input) in one go
        this.inputField = inputContainer.createEl(
          isMultiline ? 'textarea' : 'input',
          {
            ...(isMultiline ? {} : { type: 'text' }),
            placeholder: this.options.inputField.placeholder || 'Enter text...',
            value: this.options.inputField.value || ''
          }
        );

        // Apply common styles with conditional multiline styles
        this.inputField.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 3px;
          background: var(--background-primary);
          color: var(--text-normal);
          font-size: 14px;
          font-family: var(--font-interface);
          ${isMultiline ? 'min-height: 60px; resize: vertical;' : ''}
        `;

        // Handle Enter key in input field
        this.inputField.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            if (isMultiline && event.shiftKey) {
              // Shift+Enter in textarea: Allow line break (default behavior)
              return;
            } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
              // Plain Enter: Trigger onEnter callback
              event.preventDefault();
              if (this.options.inputField.onEnter) {
                this.options.inputField.onEnter(this.inputField.value, this);
              }
            }
          }
        });

        // Focus the input field
        setTimeout(() => this.inputField.focus(), 100);
      }

      // Create button container if buttons exist
      if (this.buttons && this.buttons.length > 0) {
        const buttonContainer = contentEl.createDiv({
          cls: 'modal-button-container'
        });
        buttonContainer.style.cssText = `
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid var(--background-modifier-border);
        `;

        this.buttons.forEach(button => {
          const buttonEl = buttonContainer.createEl('button', {
            text: button.text || 'Button',
            cls: 'mod-cta'
          });

          // Add hotkey hint to button text if hotkey exists
          if (button.hotkey) {
            const hotkeyHint = this.formatHotkeyHint(button.hotkey);
            buttonEl.innerHTML = `${button.text || 'Button'} <span style="opacity: 0.7; font-size: 0.8em;">(${hotkeyHint})</span>`;
          }

          const executeCallback = () => {
            if (button.callback && typeof button.callback === 'function') {
              try {
                button.callback();
              } catch (error) {
                console.error('Button callback error:', error);
              }
            }
            // Close modal after button click (unless closeModal is false)
            if (button.closeModal !== false) {
              this.close();
            }
          };

          buttonEl.addEventListener('click', executeCallback);

          // Store callback for hotkey handler
          button._executeCallback = executeCallback;
        });
      }

      // Set up keyboard event handler
      this.setupKeyboardHandler();
    }

    updateContent(newContent) {
      // Find the content div and update it
      const contentDiv = this.contentEl.querySelector('.modal-content-div');
      if (contentDiv) {
        contentDiv.empty();
        this.renderAndStyleContent(newContent, contentDiv);
      }
    }

    renderAndStyleContent(content, contentDiv) {
      // Render markdown content
      tp.obsidian.MarkdownRenderer.renderMarkdown(content, contentDiv, '', this.component);

      // Apply all content styling (code blocks, etc.)
      this.applyContentStyling(contentDiv);
    }

    applyContentStyling(container) {
      // Apply code block styling
      const preElements = container.querySelectorAll('pre');
      preElements.forEach(pre => {
        pre.style.cssText = `
          max-height: 400px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        `;
      });

      // Future styling requirements can be added here
      // e.g., table styling, image styling, etc.
    }

    setupKeyboardHandler() {
      this.keyHandler = (event) => {
        const hotkey = this.getHotkeyString(event);

        // Find button with matching hotkey
        const matchingButton = this.buttons.find(button =>
          button.hotkey && button.hotkey.toLowerCase() === hotkey.toLowerCase()
        );

        if (matchingButton && matchingButton._executeCallback) {
          event.preventDefault();
          event.stopPropagation();
          matchingButton._executeCallback();
        }
      };

      document.addEventListener('keydown', this.keyHandler);
    }

    getHotkeyString(event) {
      const parts = [];

      if (event.ctrlKey || event.metaKey) {
        parts.push('cmd');
      }
      if (event.altKey) {
        parts.push('alt');
      }
      if (event.shiftKey) {
        parts.push('shift');
      }

      // Add the main key
      const key = event.key.toLowerCase();
      if (key === 'enter') {
        parts.push('enter');
      } else if (key === 'escape') {
        parts.push('escape');
      } else if (key.length === 1) {
        parts.push(key);
      }

      return parts.join('+');
    }

    formatHotkeyHint(hotkey) {
      return hotkey
        .replace('cmd', '⌘')
        .replace('alt', '⌥')
        .replace('shift', '⇧')
        .replace('enter', '↵')
        .replace('escape', 'Esc');
    }

    onClose() {
      // Remove keyboard event handler
      if (this.keyHandler) {
        document.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }

      this.contentEl.empty();
      this.component.unload();
      if (this.resolve) {
        this.resolve();
      }
    }
  }

  return new Promise((resolve) => {
    new InfoModal(title, content, buttons, options, resolve).open();
  });
}

module.exports = modal;
