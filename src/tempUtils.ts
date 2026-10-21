import * as os from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * Get extension-specific temporary directory path
 * @returns Temporary directory file system path
 */
export function getTempDirectoryPath(): string {
  return path.join(os.tmpdir(), 'vscode-json-string-code-editor')
}

/**
 * Get extension-specific temporary directory path
 * @returns Temporary directory URI
 */
export function getTempDirectoryUri(): vscode.Uri {
  return vscode.Uri.file(getTempDirectoryPath())
}

/**
 * Normalize a file system path for comparison
 * Unifies separators and ignores case, because on Windows `vscode.Uri.fsPath`
 * lowercases the drive letter while `os.tmpdir()` keeps it as is
 * @param fsPath File system path
 * @returns Normalized path
 */
export function normalizePathForComparison(fsPath: string): string {
  return fsPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

/**
 * Check if a file is located inside the given directory
 * @param filePath File system path of the file
 * @param dirPath File system path of the directory
 * @returns Whether the file is inside the directory
 */
export function isPathInsideDirectory(filePath: string, dirPath: string): boolean {
  return normalizePathForComparison(filePath).startsWith(`${normalizePathForComparison(dirPath)}/`)
}

/**
 * Check if a file is one of the extension's temporary files
 * @param filePath File system path of the file
 * @returns Whether the file is inside the extension's temporary directory
 */
export function isTempFile(filePath: string): boolean {
  return isPathInsideDirectory(filePath, getTempDirectoryPath())
}

/**
 * Ensure temporary directory exists
 * @returns Promise<void>
 */
export async function ensureTempDirectoryExists(): Promise<void> {
  const tmpDirUri = getTempDirectoryUri()
  try {
    await vscode.workspace.fs.stat(tmpDirUri)
  }
  catch {
    await vscode.workspace.fs.createDirectory(tmpDirUri)
  }
}
