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
 * Check if a file is located inside the given directory
 * `path.relative` handles mixed separators and, on Windows, compares case-insensitively
 * (`vscode.Uri.fsPath` lowercases the drive letter while `os.tmpdir()` keeps it as is)
 * @param filePath File system path of the file
 * @param dirPath File system path of the directory
 * @param pathImpl Platform path implementation, defaults to the current platform
 * @returns Whether the file is inside the directory
 */
export function isPathInsideDirectory(filePath: string, dirPath: string, pathImpl: path.PlatformPath = path): boolean {
  const relativePath = pathImpl.relative(dirPath, filePath)
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${pathImpl.sep}`)
    && !pathImpl.isAbsolute(relativePath)
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
