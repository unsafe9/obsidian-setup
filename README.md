# Obsidian Setup

This repository contains my personal Obsidian setup designed to enhance productivity. It includes useful Templater scripts and AI-related features for better note-taking workflow.

## ⚠️ WARNING

**`setup.py` may overwrite your Obsidian settings. Backup first!**

These scripts are for my personal use, so they may change over time and might not be well documented. Please use them with caution, especially if you do not have a programming background.

This has only been tested on Mac. It might not work on other platforms.

## Requirements

- Python 3.10 or later (for `setup.py`)
  - This is not required if you copy files manually.
- Obsidian
- Obsidian Templater plugin
- Gemini API key
  - Export your API key as `GEMINI_API_KEY` environment variable before running `setup.py`.
  - See code referencing `tp.user.exec.gemini`
- Gemini CLI
  - See code referencing `tp.user.exec.geminiCli`
- Ollama
  - See code referencing `tp.user.exec.ollama`

AI features using different providers can be interchanged with each other.
