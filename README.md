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
- Gemini CLI
- Ollama

AI features using different providers can be interchanged with each other.

## Quick Setup

### Automatic Setup (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd obsidian-setup

# Set up your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Run setup in your vault directory (copies files and configures plugins)
python setup.py /path/to/your/vault

# Or run in current directory if you're already in your vault
python setup.py

# If you only want to copy files without modifying plugin settings, use --copy
python setup.py --copy /path/to/your/vault
```

### Setup Options
- `--no-backup`: Skip creating backups (backup is enabled by default)
- `--backup-dir <name>`: Custom backup directory name
- `--no-overwrite`: Skip existing files instead of overwriting
- `--copy`: Copy files only without modifying plugin settings (use this if you don't want Templater plugin configuration to be changed)
- `--configure`: Configure plugins only (requires existing config.json)

## Project Structure

### Core Components
- **`setup.py`**: Automated setup script with backup and configuration management
- **`config.json`**: Central configuration for paths, plugins, and AI settings
- **`Templater/`**: Template files and JavaScript utilities

### Templates
- **`New Note.md`**: Default template for new notes
- **`Daily Note.md`**: Template for daily notes
- **`Startup Scripts.md`**: Scripts that run when Obsidian starts

### Commands (Templater/Commands/)
Run `Insert Template` commands from Command Palette.
- **AI Text Editor**: Interactive AI-powered text editing with replace/insert options
- **Extract Note**: Extract content from current note to a new note
- **Refine Clipping**: Clean up and format web clippings using AI
- **Rename Images**: Batch rename image files with descriptive names
- **Suggest Tags**: AI-powered tag suggestions for notes
- **Summarize Note**: Generate AI summaries of note content
- **Sync H1 Title**: Synchronize note filename with H1 heading

### CSS Customizations
- **`table-row-number.css`**: Add row numbers to tables
