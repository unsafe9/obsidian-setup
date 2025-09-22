<%*
// 1. Add this file to `Template hotkeys` and assign a hotkey.
// 2. Select a text, press the hotkey.
const file = await tp.user.extractNote(tp);
if (!file) {
  return;
}

tR = `[[${file.basename}]]`;
_%>
