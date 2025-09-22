/**
 * Show a modal with the given title and content.
 * @param {string} title - The title of the modal.
 * @param {string} content - The content of the modal. It supports markdown.
 * @param {Array} buttons - Optional array of button objects with {text, callback, hotkey} properties.
 *   - text: Button text
 *   - callback: Function to call when clicked
 *   - closeModal: Whether to close modal after click (default: true)
 *   - hotkey: Keyboard shortcut (e.g., "cmd+enter", "escape", "enter")
 * @returns {Promise} Promise that resolves when the modal is closed.
 */
function modal(tp, title, content, buttons = []) {
  class InfoModal extends tp.obsidian.Modal {
    constructor(title, content, buttons, resolve) {
      super(app);
      if (title) {
        content = `# ${title}\n\n${content}`;
      }
      this.content = content;
      this.buttons = buttons;
      this.component = new tp.obsidian.Component();
      this.resolve = resolve;
      this.keyHandler = null;
    }

    onOpen() {
      const { contentEl } = this;

      contentEl.empty();

      // Render content
      const contentDiv = contentEl.createDiv();
      tp.obsidian.MarkdownRenderer.renderMarkdown(this.content, contentDiv, '', this.component);

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
    new InfoModal(title, content, buttons, resolve).open();
  });
}

module.exports = modal;
