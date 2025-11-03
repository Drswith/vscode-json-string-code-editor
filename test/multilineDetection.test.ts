import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { Position, TextDocument, workspace, Uri } from 'vscode'

describe('multiline code detection', () => {
  let detector: CodeDetector

  beforeEach(() => {
    detector = new CodeDetector()
  })

  it('should detect multiline content with escaped newlines', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-multiline-detection.json')
    const document = await workspace.openTextDocument(uri)

    const result = await detector.detectCodeAtPosition(document, new Position(1, 20))

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('expression')
    expect(result?.code).toContain('try {')
    expect(result?.code).toContain('payload.data.items.map')
    expect(result?.code).toContain('catch (e)')
  })

  it('should handle complex escaped characters in multiline content', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-complex-escaped.json')
    const document = await workspace.openTextDocument(uri)

    const result = await detector.detectCodeAtPosition(document, new Position(1, 20))

    expect(result).not.toBeNull()
    expect(result?.code).toContain('Hello\nWorld')
    expect(result?.code).toContain('/d+/g')
  })
})