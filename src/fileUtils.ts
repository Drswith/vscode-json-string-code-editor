import * as path from 'node:path'
import { globbySync, isGitIgnoredSync } from 'globby'
import * as vscode from 'vscode'

/**
 * 获取默认的 include 模式，包括基本的 JSON 文件和 package.json
 * @returns 默认的 include 模式数组
 */
function getDefaultIncludePatterns(): string[] {
  return ['**/*.json', '**/*.jsonc', '**/package.json']
}

/**
 * 检查文件是否匹配include配置的模式
 * @param document 要检查的文档
 * @returns 如果文件匹配include模式则返回true，否则返回false
 */
export function isFileIncluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const defaultPatterns = getDefaultIncludePatterns()
  const includePatterns: string[] = config.get('include', defaultPatterns)

  // 如果没有配置include模式，默认包含所有文件
  if (!includePatterns || includePatterns.length === 0) {
    return true
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) {
    // 如果没有工作区，使用VS Code内置的匹配功能
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
    // 获取文件相对于工作区的路径
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)

    // 使用 globby 进行模式匹配，同时考虑 .gitignore 文件
    const matchedFiles = globbySync(includePatterns, {
      cwd: workspaceFolder.uri.fsPath,
      gitignore: true, // 自动读取和应用 .gitignore 规则
      absolute: false,
      onlyFiles: true,
    })

    // 检查当前文件是否在匹配的文件列表中
    return matchedFiles.includes(relativePath) || matchedFiles.includes(relativePath.replace(/\\/g, '/'))
  }
  catch (error) {
    console.warn('Error matching include patterns with globby:', error)
    // 如果 globby 失败，回退到 VS Code 内置匹配
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
 * 检查文件是否匹配exclude配置的模式
 * @param document 要检查的文档
 * @returns 如果文件匹配exclude模式则返回true，否则返回false
 */
export function isFileExcluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const excludePatterns: string[] = config.get('exclude', ['**/node_modules/**', '**/dist/**', '**/build/**'])

  // 如果没有配置exclude模式，不排除任何文件
  if (!excludePatterns || excludePatterns.length === 0) {
    return false
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) {
    // 如果没有工作区，使用VS Code内置的匹配功能
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
    // 获取文件相对于工作区的路径
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)

    // 使用 globby 进行模式匹配
    const matchedFiles = globbySync(excludePatterns, {
      cwd: workspaceFolder.uri.fsPath,
      absolute: false,
      onlyFiles: true,
    })

    // 检查当前文件是否在匹配的文件列表中
    return matchedFiles.includes(relativePath) || matchedFiles.includes(relativePath.replace(/\\/g, '/'))
  }
  catch (error) {
    console.warn('Error matching exclude patterns with globby:', error)
    // 如果 globby 失败，回退到 VS Code 内置匹配
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
 * 检查文件是否被 .gitignore 忽略
 * @param document 要检查的文档
 * @returns 如果文件被 .gitignore 忽略则返回true，否则返回false
 */
export function isFileGitIgnored(document: vscode.TextDocument): boolean {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) {
    return false
  }

  try {
    // 使用 globby 的 isGitIgnoredSync 函数检查文件是否被 .gitignore 忽略
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
 * 检查文件是否应该被扩展处理
 * 同时检查文件类型、include配置、exclude配置和 .gitignore 状态
 * @param document 要检查的文档
 * @returns 如果文件应该被处理则返回true，否则返回false
 */
export function shouldProcessFile(document: vscode.TextDocument): boolean {
  // 首先检查文件类型
  if (document.languageId !== 'json' && document.languageId !== 'jsonc') {
    return false
  }

  // 检查exclude配置（如果文件被排除，则不处理）
  if (isFileExcluded(document)) {
    return false
  }

  // 检查include配置
  if (!isFileIncluded(document)) {
    return false
  }

  // 注意：我们不在这里检查 .gitignore 状态，因为 isFileIncluded 中的 globby
  // 已经通过 gitignore: true 选项自动处理了 .gitignore 规则

  return true
}
