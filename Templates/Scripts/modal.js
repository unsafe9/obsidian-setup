/**
 * Show a modal with the given title and content.
 * @param {string} title - The title of the modal.
 * @param {string} content - The content of the modal. It can contain line breaks (\n).
 */
function modal(tp, title, content) {
  class InfoModal extends tp.obsidian.Modal {
    constructor(title, content) {
      super(app);
      this.modalTitle = title;
      this.modalContent = content;
    }

    onOpen() {
      const { contentEl } = this;

      contentEl.empty();
      contentEl.createEl("h2", { text: this.modalTitle });
      contentEl.createEl("p", { text: this.modalContent, attr: { style: "white-space: pre-wrap;" } });
    }

    onClose() {
      this.contentEl.empty();
    }
  }
  new InfoModal(title, content).open();
}

module.exports = modal;
