import * as os from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * Get extension-specific temporary directory path
 * @returns Temporary directory URI
 */
export function getTempDirectoryUri(): vscode.Uri {
  const systemTmpDir = os.tmpdir()
  const extensionTmpDir = path.join(systemTmpDir, 'vscode-json-string-code-editor')
  return vscode.Uri.file(extensionTmpDir)
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
