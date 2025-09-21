#!/usr/bin/env python3

import json
import os
import string
import sys
import shutil
from pathlib import Path


class ObsidianSetup:
    def __init__(self, vault_path=None, source_path=None):
        self.vault_path = Path(vault_path) if vault_path else Path.cwd()
        self.source_path = Path(source_path) if source_path else Path.cwd()
        self.obsidian_path = self.vault_path / ".obsidian"
        self.plugins_path = self.obsidian_path / "plugins"
        self.templater_data_path = self.plugins_path / "templater-obsidian" / "data.json"
        self.config_path = self.vault_path / "config.json"
        self.source_config_path = self.source_path / "config.json"
        self.config = None

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

    def _get_backup_dir(self):
        """Get backup directory path"""
        backup_dir_name = self._get_config_value("setup.backup_directory", ".obsidian-setup-backup")
        backup_dir = self.vault_path / backup_dir_name
        backup_dir.mkdir(exist_ok=True)
        return backup_dir

    def _should_backup(self):
        """Check if backup is enabled in configuration"""
        return self._get_config_value("setup.backup_existing_config", False)

    def copy_file(self, source_path, target_path, backup_name=None):
        """Copy a file from source to target"""
        source = Path(str(source_path))
        target = Path(str(target_path))

        if not source.exists():
            return False

        # Create backup if requested
        if backup_name and target.exists():
            self.create_backup(target, backup_name)

        try:
            with open(source, "r", encoding="utf-8") as f:
                text = f.read()
            text = string.Template(text).substitute(os.environ)
            with open(target, "w", encoding="utf-8") as f:
                f.write(text)

            return True
        except Exception as e:
            print(f"❌ Error copying {source} to {target}: {e}")
            return False

    def create_backup(self, source_path, backup_name):
        """Create a backup of a file or directory in the backup directory"""
        if not self._should_backup():
            return False

        source = Path(source_path)
        if not source.exists():
            return False

        backup_dir = self._get_backup_dir()
        backup_path = backup_dir / backup_name

        try:
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

        # Get overwrite setting from config
        overwrite_files = self._get_config_value("setup.overwrite_existing_files", True)

        try:
            # Handle config.json
            if self.config_path.exists():
                if overwrite_files:
                    if self.copy_file(self.source_config_path, self.config_path, "config.json"):
                        print(f"✅ Copied config.json to: {self.config_path}")
                    else:
                        print(f"❌ Failed to copy config.json")
                        return False
                else:
                    print(f"⚠️ Skipped config.json (already exists): {self.config_path}")
            else:
                if self.copy_file(self.source_config_path, self.config_path):
                    print(f"✅ Copied config.json to: {self.config_path}")
                else:
                    print(f"❌ Failed to copy config.json")
                    return False

            # Handle Templater folder
            target_templater_path = self.vault_path / "Templater"
            if target_templater_path.exists():
                if overwrite_files:
                    self.create_backup(target_templater_path, "Templater")
                    # Remove existing folder
                    shutil.rmtree(target_templater_path)
                    shutil.copytree(source_templater_path, target_templater_path)
                    print(f"✅ Copied Templater folder to: {target_templater_path}")
                else:
                    print(f"⚠️ Skipped Templater folder (already exists): {target_templater_path}")
            else:
                shutil.copytree(source_templater_path, target_templater_path)
                print(f"✅ Copied Templater folder to: {target_templater_path}")

            # Handle CssSnippets folder
            source_css_snippets_path = self.source_path / "CssSnippets"
            if source_css_snippets_path.exists():
                target_snippets_path = self.obsidian_path / "snippets"
                target_snippets_path.mkdir(parents=True, exist_ok=True)

                # Copy each CSS file from CssSnippets to .obsidian/snippets
                for css_file in source_css_snippets_path.glob("*.css"):
                    target_css_file = target_snippets_path / css_file.name
                    if target_css_file.exists():
                        if overwrite_files:
                            self.create_backup(target_css_file, f"snippets_{css_file.name}")
                            shutil.copy2(css_file, target_css_file)
                            print(f"✅ Copied CSS snippet: {css_file.name}")
                        else:
                            print(f"⚠️ Skipped CSS snippet (already exists): {css_file.name}")
                    else:
                        shutil.copy2(css_file, target_css_file)
                        print(f"✅ Copied CSS snippet: {css_file.name}")
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
  python setup.py                           # Copy files and configure (current directory)
  python setup.py /path/to/vault           # Copy files and configure (specific vault)
  python setup.py --copy /path/to/vault    # Copy files only
  python setup.py --configure /path/to/vault  # Configure plugins only
  python setup.py --vault /path/to/vault   # Copy files and configure (explicit vault)
        """,
    )

    parser.add_argument(
        "vault_path",
        nargs="?",
        default=None,
        help="Path to the Obsidian vault directory (default: current directory)",
    )

    parser.add_argument(
        "--vault",
        "-v",
        dest="vault_path_flag",
        help="Path to the Obsidian vault directory (alternative to positional argument)",
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

    args = parser.parse_args()

    # Determine vault path from arguments
    vault_path = args.vault_path or args.vault_path_flag

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

    setup = ObsidianSetup(vault_path, source_path)

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
