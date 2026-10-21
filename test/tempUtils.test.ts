import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPathInsideDirectory, isTempFile, normalizePathForComparison } from '../src/tempUtils'

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return { ...actual, tmpdir: vi.fn(actual.tmpdir) }
})

describe('temp file path detection', () => {
  afterEach(() => {
    vi.mocked(os.tmpdir).mockRestore()
  })

  it('should normalize separators, trailing slashes and case', () => {
    expect(normalizePathForComparison('C:\\Users\\Me\\Temp\\')).toBe('c:/users/me/temp')
    expect(normalizePathForComparison('/tmp/foo/')).toBe('/tmp/foo')
  })

  it('should ignore Windows drive letter casing', () => {
    // vscode.Uri.fsPath lowercases the drive letter, os.tmpdir() does not
    expect(isPathInsideDirectory(
      'c:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor\\key_ec2e1341.md',
      'C:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor',
    )).toBe(true)
  })

  it('should handle mixed path separators', () => {
    expect(isPathInsideDirectory(
      'C:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor\\key.md',
      'C:/Users/me/AppData/Local/Temp/vscode-json-string-code-editor/',
    )).toBe(true)
  })

  it('should not match sibling directories sharing the same prefix', () => {
    expect(isPathInsideDirectory(
      '/tmp/vscode-json-string-code-editor-other/key.md',
      '/tmp/vscode-json-string-code-editor',
    )).toBe(false)
    expect(isPathInsideDirectory(
      '/home/me/project/test.json',
      '/tmp/vscode-json-string-code-editor',
    )).toBe(false)
  })

  it('should detect files in the extension temp directory', () => {
    expect(isTempFile(path.join(os.tmpdir(), 'vscode-json-string-code-editor', 'key_ec2e1341.md'))).toBe(true)
    expect(isTempFile(path.join(os.tmpdir(), 'key_ec2e1341.md'))).toBe(false)
  })

  it('should detect temp files when os.tmpdir() and fsPath use different drive letter casing', () => {
    vi.mocked(os.tmpdir).mockReturnValue('C:\\Users\\me\\AppData\\Local\\Temp')

    expect(isTempFile('c:\\Users\\me\\AppData\\Local\\Temp\\vscode-json-string-code-editor\\key_ec2e1341.md')).toBe(true)
    expect(isTempFile('c:\\Users\\me\\project\\test.json')).toBe(false)
  })
})
