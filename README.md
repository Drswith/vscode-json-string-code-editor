# JSON String Code Editor

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/Drswith.vscode-json-string-code-editor.svg?color=blue&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor)

[![VS Code Marketplace Downloads](https://img.shields.io/vscode-marketplace/d/Drswith.vscode-json-string-code-editor.svg?color=blue&label=VS%20Code%20Downloads)](https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor)

[![VS Code Marketplace Installs](https://img.shields.io/vscode-marketplace/i/Drswith.vscode-json-string-code-editor.svg?color=blue&label=VS%20Code%20Installs)](https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor)

[![Open VSX Registry](https://img.shields.io/open-vsx/v/Drswith/vscode-json-string-code-editor.svg?color=c160ef&label=Open%20VSX)](https://open-vsx.org/extension/Drswith/vscode-json-string-code-editor)

[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/Drswith/vscode-json-string-code-editor.svg?color=c160ef&label=OpenVSX%20Downloads)](https://open-vsx.org/extension/Drswith/vscode-json-string-code-editor)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful VS Code extension that enhances the editing experience of code snippets embedded within JSON and JSONC files. Edit JavaScript, TypeScript, Python, and other code directly in temporary editor tabs with full syntax highlighting, IntelliSense, and language support.

## ✨ Features

- **🚀 Temporary Code Editor**: Open code strings in dedicated temporary editor tabs with full language support
- **🎯 Smart Detection**: Automatically detects code in JSON string fields like `adaptor`, `script`, `code`, `expression`
- **🌈 Syntax Highlighting**: Full syntax highlighting and IntelliSense for multiple programming languages
- **🔧 Right-click Integration**: Easy access through context menu in JSON/JSONC files
- **⚡ Real-time Sync**: Changes in temporary editors are automatically synced back to the original JSON
- **🧹 Auto Cleanup**: Automatic cleanup of temporary files when editors are closed
- **⚙️ Configurable**: Customizable field detection patterns and file inclusion rules

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "JSON String Code Editor"
4. Click Install

### From Command Line

```bash
code --install-extension drswith.vscode-json-string-code-editor
```

## 🚀 Usage

### Basic Usage

1. **Open a JSON or JSONC file** containing code strings
2. **Right-click** on a string value that contains code
3. **Select "Edit Code in Temporary Editor"** from the context menu
4. **Edit your code** in the new temporary tab with full language support
5. **Save the temporary file** (Ctrl+S) to sync changes back to the original JSON

### Example JSON Structure

```json
{
  "adaptor": "const adaptor = require('./adaptor');\nconsole.log('Adaptor loaded');",
  "script": "function processData(data) {\n  return data.map(item => item.value);\n}",
  "code": "try {\n  const result = await fetchData();\n  return result;\n} catch (error) {\n  console.error(error);\n}"
}
```

### Language Detection

The extension automatically detects the programming language based on field names and content analysis. The following languages are supported (built-in, not customizable):

**Supported Languages:**

- **JavaScript** (default fallback)
- **TypeScript**
- **Python**
- **SQL**
- **HTML**
- **CSS**
- **Java**
- **PHP**
- **Shell/Bash**
- **JSON**
- **Go**
- **Rust**
- **C/C++**
- **XML**
- **YAML**
- **Markdown**
- **Dockerfile**

**Detection Logic:**

- **Field name analysis**: Fields containing keywords like `sql`, `html`, `python`, `typescript`, etc. are detected accordingly
- **Content analysis**: The extension analyzes code syntax patterns to determine the most appropriate language
- **Default fallback**: When language cannot be determined, JavaScript is used as the default

> **Note**: Language detection is built into the extension and cannot be customized by users. The detection algorithms are optimized for common use cases and code patterns.

### Keyboard Shortcuts

- **Ctrl+S** (Cmd+S on Mac): Save temporary file and sync changes back to original JSON
- **Ctrl+Shift+P** (Cmd+Shift+P on Mac): Open Command Palette to access extension commands

### Tips

- The extension works with both JSON and JSONC (JSON with Comments) files
- Temporary files are automatically cleaned up when editors are closed
- Use the Command Palette to manually clean up temporary files if needed
- The extension respects VS Code's file inclusion/exclusion patterns

## ⚙️ Configuration

Access settings via `File > Preferences > Settings` and search for "JSON String Code Editor".

### Available Settings

<!-- configs -->

| Key                                              | Description                                                     | Type     | Default                                             |
| ------------------------------------------------ | --------------------------------------------------------------- | -------- | --------------------------------------------------- |
| `vscode-json-string-code-editor.include`         | Glob patterns for files where the extension should be active    | `array`  | `["**/*.json","**/*.jsonc"]`                        |
| `vscode-json-string-code-editor.exclude`         | Glob patterns for files that should be excluded from processing | `array`  | `["**/node_modules/**","**/dist/**","**/build/**"]` |
| `vscode-json-string-code-editor.recentLanguages` | Recently used programming languages for code editing            | `array`  | `[]`                                                |
| `vscode-json-string-code-editor.logLevel`        | Set the logging level for the extension                         | `string` | `"info"`                                            |

<!-- configs -->

### Example Configuration

```json
{
  "vscode-json-string-code-editor.include": [
    "**/*.json",
    "**/*.jsonc",
    "**/config/*.json"
  ]
}
```

## 🎯 Commands

The extension provides the following commands accessible via Command Palette (Ctrl+Shift+P):

- **Edit Code in Temporary Editor**: Open selected JSON string in a temporary editor
- **Edit Code at Range**: Edit code at a specific range
- **Clean Up Temporary Files**: Manually clean up all temporary files
<!-- commands -->

| Command                                           | Title                                                  |
| ------------------------------------------------- | ------------------------------------------------------ |
| `vscode-json-string-code-editor.editCode`         | JSON String Code Editor: Edit Code in Temporary Editor |
| `vscode-json-string-code-editor.editCodeAtRange`  | JSON String Code Editor: Edit Code at Range            |
| `vscode-json-string-code-editor.cleanupTempFiles` | JSON String Code Editor: Clean Up Temporary Files      |

<!-- commands -->

## 🔧 Development

### Prerequisites

- Node.js 16+
- pnpm package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/Drswith/vscode-json-string-code-editor.git
cd vscode-json-string-code-editor

# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Run tests
pnpm test

# Watch mode for development
pnpm run dev
```

### Building

```bash
# Build for production
pnpm run build

# Package the extension
pnpm run ext:pack
```

## 🔍 Troubleshooting

### Common Issues

**Extension not detecting code fields**

- Verify the file matches the `include` patterns and doesn't match `exclude` patterns

**Temporary editor not opening**

- Make sure you're right-clicking on a string value, not the field name
- Check that the file is a JSON or JSONC file
- Verify the extension is activated (should show in the status bar)

**Changes not syncing back to original file**

- Save the temporary file using Ctrl+S (Cmd+S on Mac)
- Check that the original JSON file is not read-only
- Ensure the temporary file hasn't been moved or renamed

**Performance issues with large files**

- Use the `exclude` setting to skip large directories like `node_modules`

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/Drswith/vscode-json-string-code-editor/issues) for existing solutions
2. Enable debug logging by setting `logLevel` to `"debug"` in extension settings
3. Check the VS Code Output panel (View → Output → JSON String Code Editor)
4. Create a new issue with detailed reproduction steps

## 🤝 Contributing

We welcome Issues and Pull Requests! For major changes, please create an Issue first to discuss what you would like to change.

### 🚀 Quick Start

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### 📋 Contributing Guidelines

- 🐛 **Bug Reports**: Use [Issue templates](https://github.com/Drswith/vscode-json-string-code-editor/issues/new) to report problems
- 💡 **Feature Requests**: Submit feature requests and improvement suggestions
- 📖 **Documentation**: Help improve documentation and examples
- 🧪 **Testing**: Add test cases and improve code coverage
- 🎨 **Code Optimization**: Performance improvements, code refactoring, etc.

### 🏆 Contributors

<div align="center">
  <h3>🌟 Thanks to all the developers who contributed to this project! 🌟</h3>

  <!-- Contributors Display -->
  <a href="https://github.com/Drswith/vscode-json-string-code-editor/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Drswith/vscode-json-string-code-editor&max=100&columns=20" alt="Contributors" />
  </a>

<br><br>

  <!-- Project Statistics Badges -->
  <img src="https://img.shields.io/github/contributors/Drswith/vscode-json-string-code-editor?style=for-the-badge&color=ff69b4" alt="Contributors Count">
  <img src="https://img.shields.io/github/commit-activity/m/Drswith/vscode-json-string-code-editor?style=for-the-badge&color=00d4aa" alt="Commit Activity">
  <img src="https://img.shields.io/github/last-commit/Drswith/vscode-json-string-code-editor?style=for-the-badge&color=ffd700" alt="Last Commit">
  <img src="https://img.shields.io/github/issues/Drswith/vscode-json-string-code-editor?style=for-the-badge&color=orange" alt="Open Issues">
  <img src="https://img.shields.io/github/issues-pr/Drswith/vscode-json-string-code-editor?style=for-the-badge&color=blue" alt="Open PRs">

</div>

> 🎨 Contributors display powered by [contrib.rocks](https://contrib.rocks)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find this extension helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- ☕ [Sponsoring the project](https://github.com/sponsors/Drswith)

## 📚 Related

- [VS Code Extension API](https://code.visualstudio.com/api)
- [JSON Schema](https://json-schema.org/)
- [JSONC (JSON with Comments)](https://github.com/microsoft/node-jsonc-parser)

---

**Enjoy coding! 🎉**
