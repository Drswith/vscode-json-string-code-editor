import * as path from 'node:path'
import { globbySync, isGitIgnoredSync } from 'globby'
import * as vscode from 'vscode'

/**
 * Get default include patterns, including basic JSON files and package.json
 * @returns Default include pattern array
 */
function getDefaultIncludePatterns(): string[] {
  return ['**/*.json', '**/*.jsonc', '**/package.json']
}

/**
 * Check if file matches include configuration patterns
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
  if (!workspaceFolder) {
    // If no workspace, use VS Code built-in matching functionality
    return includePatterns.some((pattern) => {
      try {
        const documentSelector: vscode.DocumentSelector = { pattern }
        return vscode.languages.match(documentSelector, document) > 0
      }
      catch (error) {
        console.warn(`Invalid include pattern: ${pattern}`, error)
        return false
      }
    })
  }

  try {
    // Get file path relative to workspace
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)

    // Use globby for pattern matching, also considering .gitignore files
    const matchedFiles = globbySync(includePatterns, {
      cwd: workspaceFolder.uri.fsPath,
      gitignore: true, // Automatically read and apply .gitignore rules
      absolute: false,
      onlyFiles: true,
    })

    // Check if current file is in the matched file list
    return matchedFiles.includes(relativePath) || matchedFiles.includes(relativePath.replace(/\\/g, '/'))
  }
  catch (error) {
    console.warn('Error matching include patterns with globby:', error)
    // If globby fails, fallback to VS Code built-in matching
    return includePatterns.some((pattern) => {
      try {
        const documentSelector: vscode.DocumentSelector = {
          pattern: new vscode.RelativePattern(workspaceFolder, pattern),
        }
        return vscode.languages.match(documentSelector, document) > 0
      }
      catch (error) {
        console.warn(`Invalid include pattern: ${pattern}`, error)
        return false
      }
    })
  }
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
  if (!workspaceFolder) {
    // If no workspace, use VS Code built-in matching functionality
    return excludePatterns.some((pattern) => {
      try {
        const documentSelector: vscode.DocumentSelector = { pattern }
        return vscode.languages.match(documentSelector, document) > 0
      }
      catch (error) {
        console.warn(`Invalid exclude pattern: ${pattern}`, error)
        return false
      }
    })
  }

  try {
    // Get file path relative to workspace
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)

    // Use globby for pattern matching
    const matchedFiles = globbySync(excludePatterns, {
      cwd: workspaceFolder.uri.fsPath,
      absolute: false,
      onlyFiles: true,
    })

    // Check if current file is in the matched file list
    return matchedFiles.includes(relativePath) || matchedFiles.includes(relativePath.replace(/\\/g, '/'))
  }
  catch (error) {
    console.warn('Error matching exclude patterns with globby:', error)
    // If globby fails, fallback to VS Code built-in matching
    return excludePatterns.some((pattern) => {
      try {
        const documentSelector: vscode.DocumentSelector = {
          pattern: new vscode.RelativePattern(workspaceFolder, pattern),
        }
        return vscode.languages.match(documentSelector, document) > 0
      }
      catch (error) {
        console.warn(`Invalid exclude pattern: ${pattern}`, error)
        return false
      }
    })
  }
}

/**
 * Check if file is ignored by .gitignore
 * @param document Document to check
 * @returns Returns true if file is ignored by .gitignore, otherwise false
 */
export function isFileGitIgnored(document: vscode.TextDocument): boolean {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) {
    return false
  }

  try {
    // Use globby's isGitIgnoredSync function to check if file is ignored by .gitignore
    const isIgnored = isGitIgnoredSync({ cwd: workspaceFolder.uri.fsPath })
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
    return isIgnored(relativePath)
  }
  catch (error) {
    console.warn('Error checking .gitignore status:', error)
    return false
  }
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

  // Note: We don't check .gitignore status here because globby in isFileIncluded
  // already handles .gitignore rules automatically through the gitignore: true option

  return true
}
