/**
 * Show a modal with the given title and content.
 * @param {string} title - The title of the modal.
 * @param {string} content - The content of the modal. It supports markdown.
 */
function modal(tp, title, content) {
  class InfoModal extends tp.obsidian.Modal {
    constructor(title, content) {
      super(app);
      if (title) {
        content = `# ${title}\n\n${content}`;
      }
      this.content = content;
      this.component = new tp.obsidian.Component();
    }

    onOpen() {
      const { contentEl } = this;

      contentEl.empty();
      tp.obsidian.MarkdownRenderer.renderMarkdown(this.content, contentEl, '', this.component);
    }

    onClose() {
      this.contentEl.empty();
      this.component.unload();
    }
  }
  new InfoModal(title, content).open();
}

module.exports = modal;
