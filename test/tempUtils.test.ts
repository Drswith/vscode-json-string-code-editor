import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isPathInsideDirectory, isTempFile } from '../src/tempUtils'

describe('temp file path detection', () => {
  it('should ignore Windows drive letter casing', () => {
    // vscode.Uri.fsPath lowercases the drive letter, os.tmpdir() does not
    expect(isPathInsideDirectory(
      'c:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor\\key_ec2e1341.md',
      'C:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor',
      path.win32,
    )).toBe(true)
  })

  it('should handle mixed path separators on Windows', () => {
    expect(isPathInsideDirectory(
      'C:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor\\key.md',
      'C:/Users/me/AppData/Local/Temp/vscode-json-string-code-editor/',
      path.win32,
    )).toBe(true)
  })

  it('should not match files on another Windows drive', () => {
    expect(isPathInsideDirectory(
      'D:\\project\\test.json',
      'C:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor',
      path.win32,
    )).toBe(false)
  })

  it('should stay case-sensitive on POSIX', () => {
    expect(isPathInsideDirectory('/TMP/vscode-json-string-code-editor/key.md', '/tmp/vscode-json-string-code-editor', path.posix)).toBe(false)
  })

  it('should not match sibling directories sharing the same prefix', () => {
    expect(isPathInsideDirectory(
      '/tmp/vscode-json-string-code-editor-other/key.md',
      '/tmp/vscode-json-string-code-editor',
      path.posix,
    )).toBe(false)
    expect(isPathInsideDirectory(
      'C:\\Temp\\vscode-json-string-code-editor-other\\key.md',
      'C:\\Temp\\vscode-json-string-code-editor',
      path.win32,
    )).toBe(false)
  })

  it('should not match the directory itself or unrelated files', () => {
    expect(isPathInsideDirectory('/tmp/vscode-json-string-code-editor', '/tmp/vscode-json-string-code-editor', path.posix)).toBe(false)
    expect(isPathInsideDirectory('/home/me/project/test.json', '/tmp/vscode-json-string-code-editor', path.posix)).toBe(false)
  })

  it('should detect files in the extension temp directory', () => {
    expect(isTempFile(path.join(os.tmpdir(), 'vscode-json-string-code-editor', 'key_ec2e1341.md'))).toBe(true)
    expect(isTempFile(path.join(os.tmpdir(), 'key_ec2e1341.md'))).toBe(false)
  })
})
