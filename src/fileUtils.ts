import * as vscode from 'vscode'

/**
 * Get default include patterns, including basic JSON files and package.json
 * @returns Default include pattern array
 */
function getDefaultIncludePatterns(): string[] {
  return ['**/*.json', '**/*.jsonc', '**/package.json']
}

/**
 * Fast pattern matching using VS Code's built-in DocumentSelector
 * This avoids loading globby for simple pattern matches
 */
function matchPatternWithVSCode(pattern: string, document: vscode.TextDocument, workspaceFolder?: vscode.WorkspaceFolder): boolean {
  try {
    const documentSelector: vscode.DocumentSelector = workspaceFolder
      ? { pattern: new vscode.RelativePattern(workspaceFolder, pattern) }
      : { pattern }
    return vscode.languages.match(documentSelector, document) > 0
  }
  catch (error) {
    console.warn(`Invalid pattern: ${pattern}`, error)
    return false
  }
}

/**
 * Check if file matches include configuration patterns
 * Uses VS Code's built-in DocumentSelector for optimal performance
 * @param document Document to check
 * @returns Returns true if file matches include patterns, otherwise false
 */
export function isFileIncluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const defaultPatterns = getDefaultIncludePatterns()
  const includePatterns: string[] = config.get('include', defaultPatterns)

  // If no include patterns are configured, include all files by default
  if (!includePatterns || includePatterns.length === 0) {
    return true
  }

  // Get workspace folder
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)

  // Use VS Code's built-in pattern matching (faster, no external dependency)
  return includePatterns.some(pattern => matchPatternWithVSCode(pattern, document, workspaceFolder))
}

/**
 * Check if file matches exclude configuration patterns
 * @param document Document to check
 * @returns Returns true if file matches exclude patterns, otherwise false
 */
export function isFileExcluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const excludePatterns: string[] = config.get('exclude', ['**/node_modules/**', '**/dist/**', '**/build/**'])

  // If no exclude patterns are configured, don't exclude any files
  if (!excludePatterns || excludePatterns.length === 0) {
    return false
  }

  // Get workspace folder
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)

  // Use VS Code's built-in pattern matching (faster, no external dependency)
  return excludePatterns.some(pattern => matchPatternWithVSCode(pattern, document, workspaceFolder))
}

/**
 * Check if file should be processed by the extension
 * Check file type, include configuration, exclude configuration and .gitignore status
 * @param document Document to check
 * @returns Returns true if file should be processed, otherwise false
 */
export function shouldProcessFile(document: vscode.TextDocument): boolean {
  // First check file type
  if (document.languageId !== 'json' && document.languageId !== 'jsonc') {
    return false
  }

  // Check exclude configuration (if file is excluded, don't process)
  if (isFileExcluded(document)) {
    return false
  }

  // Check include configuration
  if (!isFileIncluded(document)) {
    return false
  }

  return true
}
