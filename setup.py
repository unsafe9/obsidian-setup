#!/usr/bin/env python3

import json
import os
import string
import sys
import shutil
from pathlib import Path


class ObsidianSetup:
    def __init__(self, vault_path=None, source_path=None, backup_existing_config=True, backup_directory=".obsidian-setup-backup", overwrite_existing_files=True):
        self.vault_path = Path(vault_path) if vault_path else Path.cwd()
        self.source_path = Path(source_path) if source_path else Path.cwd()
        self.obsidian_path = self.vault_path / ".obsidian"
        self.plugins_path = self.obsidian_path / "plugins"
        self.templater_data_path = self.plugins_path / "templater-obsidian" / "data.json"
        self.config_path = self.vault_path / "config.json"
        self.source_config_path = self.source_path / "config.json"
        self.config = None
        self.backup_existing_config = backup_existing_config
        self.backup_directory = self.vault_path / backup_directory
        self.overwrite_existing_files = overwrite_existing_files

    def load_config(self):
        """Load configuration from config.json"""
        if not self.config_path.exists():
            print(f"❌ Configuration file not found: {self.config_path}")
            print("Please ensure config.json exists in the vault root directory.")
            sys.exit(1)

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading configuration: {e}")
            sys.exit(1)

    def check_plugin_installed(self, plugin_name):
        """Check if a plugin is installed"""
        plugin_path = self.plugins_path / plugin_name
        manifest_path = plugin_path / "manifest.json"
        return plugin_path.exists() and manifest_path.exists()

    def check_required_plugins(self):
        """Check if all required plugins are installed"""
        required_plugins = self.config.get("required_plugins", [])

        missing_plugins = []
        for plugin in required_plugins:
            if not self.check_plugin_installed(plugin):
                missing_plugins.append(plugin)

        if missing_plugins:
            print("❌ The following required plugins are not installed:")
            for plugin in missing_plugins:
                print(f"   - {plugin}")
            print("\nInstallation instructions:")
            print("1. Open Obsidian and go to Settings > Community plugins")
            print("2. Click the 'Browse' button")
            print("3. Search for and install the plugins listed above")
            print("4. Enable the plugins after installation")
            print("5. Run this script again after installation is complete")
            return False

        print("✅ All required plugins are installed.")
        return True

    def get_command_templates(self):
        """Find template files specifically in the Commands folder for hotkey registration"""
        commands_folder = self.config["paths"]["commands_folder"]
        commands_path = self.vault_path / commands_folder

        if not commands_path.exists():
            print(f"⚠️ Commands folder not found: {commands_path}")
            return []

        command_files = []
        for file_path in commands_path.glob("*.md"):
            relative_path = file_path.relative_to(self.vault_path)
            command_files.append(str(relative_path))

        return sorted(command_files)

    def _load_source_config(self):
        """Load configuration from source config.json file"""
        try:
            with open(self.source_config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _get_config_value(self, path, default=None):
        """Get configuration value, trying loaded config first, then source config"""
        keys = path.split(".")

        # Try loaded config first
        if self.config:
            value = self.config
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    value = None
                    break
            if value is not None:
                return value

        # Fallback to source config
        source_config = self._load_source_config()
        value = source_config
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        return value

    def copy_file(self, source_path, target_path, backup_relative_path=None, templating=False, relative_path=None):
        """Copy a file from source to target with automatic backup, overwrite handling, and logging"""
        source = Path(str(source_path))
        target = Path(str(target_path))
        display_path = relative_path if relative_path else target.name

        if not source.exists():
            print(f"❌ Source file not found: {source}")
            return False

        # Check if target exists and handle overwrite logic
        file_existed = target.exists()

        if file_existed and not self.overwrite_existing_files:
            print(f"⚠️ Skipped (already exists): {display_path}")
            return True  # Return True as this is expected behavior, not an error

        try:
            # Create parent directories if they don't exist
            target.parent.mkdir(parents=True, exist_ok=True)

            # Create backup if backup path is provided, backup is enabled, and file exists
            if backup_relative_path and file_existed:
                self.create_backup(target, backup_relative_path)

            with open(source, "r", encoding="utf-8") as f:
                text = f.read()

            # Apply template substitution only if templating is enabled
            if templating:
                text = string.Template(text).substitute(os.environ)

            with open(target, "w", encoding="utf-8") as f:
                f.write(text)

            # Log success based on whether file existed before
            action = "Updated" if file_existed else "Copied"
            print(f"✅ {action}: {display_path}")
            return True

        except Exception as e:
            print(f"❌ Failed to copy: {display_path} ({e})")
            return False

    def create_backup(self, source_path, relative_path=None):
        """Create a backup of a file maintaining directory structure"""
        if not self.backup_existing_config:
            return False

        source = Path(source_path)
        if not source.exists():
            return False

        # Create backup directory if it doesn't exist
        self.backup_directory.mkdir(parents=True, exist_ok=True)

        # Use relative path if provided, otherwise use filename
        if relative_path:
            backup_path = self.backup_directory / relative_path
        else:
            backup_path = self.backup_directory / source.name

        try:
            # Create parent directories for the backup file
            backup_path.parent.mkdir(parents=True, exist_ok=True)

            if source.is_file():
                shutil.copy2(source, backup_path)
            else:
                if backup_path.exists():
                    shutil.rmtree(backup_path)
                shutil.copytree(source, backup_path)

            print(f"📋 Backed up to: {backup_path}")
            return True
        except Exception as e:
            print(f"⚠️ Failed to backup {source}: {e}")
            return False

    def _copy_directory_contents(self, source_dir, target_dir, backup_prefix=None):
        """Copy directory contents recursively, creating directories as needed and only overwriting files if specified"""
        source = Path(source_dir)
        target = Path(target_dir)

        if not source.exists():
            print(f"❌ Source directory not found: {source}")
            return False

        # Create target directory if it doesn't exist
        target.mkdir(parents=True, exist_ok=True)

        # Determine backup prefix based on source directory name if not provided
        if backup_prefix is None:
            backup_prefix = source.name

        try:
            success_count = 0
            total_count = 0

            for item in source.rglob("*"):
                if item.is_file():
                    total_count += 1
                    # Calculate relative path from source
                    relative_path = item.relative_to(source)
                    target_file = target / relative_path

                    # Generate backup path maintaining directory structure
                    backup_relative_path = Path(backup_prefix) / relative_path

                    # Copy file (copy_file handles all logic internally)
                    if self.copy_file(item, target_file, backup_relative_path=backup_relative_path, relative_path=relative_path):
                        success_count += 1

            print(f"✅ Processed {backup_prefix} folder: {success_count}/{total_count} files processed successfully")
            return success_count == total_count

        except Exception as e:
            print(f"❌ Error copying directory contents: {e}")
            return False

    def copy_files_to_vault(self):
        """Copy config.json, Templater folder, and CssSnippets to the target vault"""
        print("📁 Copying files to target vault...")

        # Check if source files exist
        if not self.source_config_path.exists():
            print(f"❌ Source config.json not found: {self.source_config_path}")
            return False

        source_templater_path = self.source_path / "Templater"
        if not source_templater_path.exists():
            print(f"❌ Source Templater folder not found: {source_templater_path}")
            return False

        try:
            # Handle config.json
            if not self.copy_file(self.source_config_path, self.config_path, backup_relative_path="config.json", templating=True, relative_path="config.json"):
                return False

            # Handle Templater folder - copy files individually
            target_templater_path = self.vault_path / "Templater"
            if not self._copy_directory_contents(source_templater_path, target_templater_path, "Templater"):
                return False
            print()

            # Handle CssSnippets folder
            source_css_snippets_path = self.source_path / "CssSnippets"
            if source_css_snippets_path.exists():
                target_snippets_path = self.obsidian_path / "snippets"
                if not self._copy_directory_contents(source_css_snippets_path, target_snippets_path, "CssSnippets"):
                    return False
            else:
                print(f"⚠️ Source CssSnippets folder not found: {source_css_snippets_path}")

            return True

        except Exception as e:
            print(f"❌ Error copying files: {e}")
            return False

    def create_folder_templates(self):
        """Create folder templates configuration based on note directories"""
        note_dirs = self.config["paths"]["note_directories"]
        daily_dirs = self.config["paths"]["daily_note_directories"]
        new_note_template = self.config["paths"]["new_note_template"]
        daily_note_template = self.config["paths"]["daily_note_template"]

        return [{"folder": note_dir, "template": daily_note_template if note_dir in daily_dirs else new_note_template} for note_dir in note_dirs]

    def setup_templater_config(self):
        """Configure Templater plugin settings"""
        # Create .obsidian/plugins/templater-obsidian directory if it doesn't exist
        self.templater_data_path.parent.mkdir(parents=True, exist_ok=True)

        existing_config = {}
        config_exists = self.templater_data_path.exists()

        if not config_exists:
            print(f"📝 Templater configuration file not found. Creating new one: {self.templater_data_path}")
        else:
            print(f"📝 Found existing Templater configuration: {self.templater_data_path}")

        try:
            # Read existing configuration if it exists
            if config_exists:
                with open(self.templater_data_path, "r", encoding="utf-8") as f:
                    existing_config = json.load(f)

                # Create backup using unified backup system
                self.create_backup(self.templater_data_path, "data.json")
            else:
                existing_config = {}

            # Get command template files for hotkey registration
            command_templates = self.get_command_templates()

            # Create folder templates dynamically
            folder_templates = self.create_folder_templates()

            # Create templater configuration
            templater_config = {
                "templates_folder": self.config["paths"]["templates_folder"],
                "trigger_on_file_creation": True,  # Always enable
                "user_scripts_folder": self.config["paths"]["user_scripts_folder"],
                "enable_folder_templates": True,
                "folder_templates": folder_templates,
                "enable_file_templates": False,
                "file_templates": [{"regex": ".*", "template": ""}],
                "enabled_templates_hotkeys": command_templates,
                "startup_templates": [self.config["paths"]["startup_template"]],
            }

            # Merge with existing config (preserve any additional settings)
            existing_config.update(templater_config)

            # Save updated configuration
            with open(self.templater_data_path, "w", encoding="utf-8") as f:
                json.dump(existing_config, f, indent=2, ensure_ascii=False)

            action = "created" if not config_exists else "updated"
            print(f"✅ Templater configuration {action} successfully:")
            print(f"   - Templates folder: {existing_config['templates_folder']}")
            print(f"   - User scripts folder: {existing_config['user_scripts_folder']}")
            print(f"   - Folder templates: {len(existing_config['folder_templates'])} folders")
            print(f"   - Enabled template hotkeys: {len(existing_config['enabled_templates_hotkeys'])} templates")
            print(f"   - Startup templates: {len(existing_config['startup_templates'])} template(s)")
            print(f"   - File creation trigger: {'Enabled' if existing_config['trigger_on_file_creation'] else 'Disabled'}")

            return True

        except Exception as e:
            print(f"❌ Error configuring Templater: {e}")
            return False

    def run_setup(self, copy_files=False, configure_only=False):
        """Run the setup process based on options"""
        # Determine what operations to perform
        do_copy = copy_files or (not copy_files and not configure_only)  # Copy if --copy or default
        do_configure = configure_only or (not copy_files and not configure_only)  # Configure if --configure or default

        print("🔧 Starting Obsidian Setup...")
        print(f"📁 Vault path: {self.vault_path}")
        if do_copy:
            print(f"📂 Source path: {self.source_path}")
        print()

        step = 1

        # 1. Copy files if needed
        if do_copy:
            print(f"{step}️⃣ Copying files to vault...")
            if not self.copy_files_to_vault():
                return False
            print()
            step += 1

        # 2. Configure plugins if needed
        if do_configure:
            # Load config after potential copying
            if not self.config:
                self.config = self.load_config()
                if not self.config:
                    return False

            # Check required plugins
            print(f"{step}️⃣ Checking required plugins...")
            if not self.check_required_plugins():
                return False
            print()
            step += 1

            # Configure Templater
            print(f"{step}️⃣ Configuring Templater plugin...")
            if not self.setup_templater_config():
                return False
            print()

        print("🎉 Setup completed successfully!")
        if do_configure:
            print("💡 Please restart Obsidian to apply the changes.")
        return True


def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Configure Obsidian vault with required plugins and settings",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python setup.py                           # Copy files and configure with backup (current directory)
  python setup.py /path/to/vault           # Copy files and configure with backup (specific vault)
  python setup.py --copy /path/to/vault    # Copy files only with backup
  python setup.py --configure /path/to/vault  # Configure plugins only
  python setup.py --no-backup              # Copy and configure without creating backups
  python setup.py --backup-dir my-backup   # Create backups in custom directory
  python setup.py --no-overwrite           # Skip existing files instead of overwriting
        """,
    )

    parser.add_argument(
        "vault_path",
        nargs="?",
        default=None,
        help="Path to the Obsidian vault directory (default: current directory)",
    )

    parser.add_argument(
        "--copy",
        "-c",
        action="store_true",
        help="Copy config.json and Templater folder to the target vault",
    )

    parser.add_argument(
        "--configure",
        "-C",
        action="store_true",
        help="Configure plugins settings only (requires existing config.json in target vault)",
    )

    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Do not create backup of existing configuration files (backup is enabled by default)",
    )

    parser.add_argument(
        "--backup-dir",
        default=".obsidian-setup-backup",
        help="Directory name for backups (default: .obsidian-setup-backup)",
    )

    parser.add_argument(
        "--no-overwrite",
        action="store_true",
        help="Do not overwrite existing files (skip them instead)",
    )

    args = parser.parse_args()

    # Determine vault path from arguments
    vault_path = args.vault_path

    if vault_path:
        vault_path = Path(vault_path).resolve()
        if not vault_path.exists():
            print(f"❌ Vault path does not exist: {vault_path}")
            sys.exit(1)
        if not vault_path.is_dir():
            print(f"❌ Vault path is not a directory: {vault_path}")
            sys.exit(1)

    # Validate options
    if args.copy and args.configure:
        print("❌ Cannot use --copy and --configure together. Use one or neither (for both).")
        sys.exit(1)

    # Determine source path (current directory by default)
    source_path = Path.cwd()

    # If copying to a different vault, ensure we have source files
    if (args.copy or (not args.copy and not args.configure)) and vault_path and vault_path != source_path:
        if not (source_path / "config.json").exists():
            print(f"❌ Source config.json not found in: {source_path}")
            sys.exit(1)
        if not (source_path / "Templater").exists():
            print(f"❌ Source Templater folder not found in: {source_path}")
            sys.exit(1)

    setup = ObsidianSetup(vault_path=vault_path, source_path=source_path, backup_existing_config=not args.no_backup, backup_directory=args.backup_dir, overwrite_existing_files=not args.no_overwrite)

    try:
        success = setup.run_setup(copy_files=args.copy, configure_only=args.configure)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️ Setup interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
