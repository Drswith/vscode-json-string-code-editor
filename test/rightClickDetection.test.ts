import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { Position, TextDocument, workspace, Uri } from 'vscode'

describe('right click code detection', () => {
  let detector: CodeDetector

  beforeEach(() => {
    detector = new CodeDetector()
  })

  it('should detect code at cursor position in string field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside the string field
    const position = new Position(2, 20) // Inside the script field
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.code).toBe('console.log(\'Hello World\');')
    expect(result?.fieldName).toBe('script')
  })

  it('should return null when cursor is not in a string field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor outside string content
    const position = new Position(0, 5) // In the field name
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).toBeNull()
  })

  it('should handle nested JSON structures', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-nested.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside nested string
    const position = new Position(2, 30)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should handle array elements with string content', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-array.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(2, 25)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should detect any string field content', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-non-js.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor in the "other" field string content
    const position = new Position(2, 12) // Inside the "other" field value "normal text"
    const result = await detector.detectCodeAtPosition(document, position)

    // Now we detect any string content, not just code
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('other')
  })

  it('should handle malformed JSON gracefully', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-malformed.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor in malformed JSON
    const position = new Position(1, 20)
    const result = await detector.detectCodeAtPosition(document, position)

    // Should still detect string content even in malformed JSON
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should detect content in adaptor field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-adaptor.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(1, 30)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
    expect(result?.code).toBe('function test() { return \'hello\'; }')
  })

  it('should detect content in script field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-script.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(1, 25)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('script')
  })

  it('should generate correct keyPath for multiple properties in same object', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside the "second" field in multipleProperties object
    // Line 16: "second": "const y = 2;",
    const position = new Position(15, 18)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('second')
    // Bug fix: keyPath should be "multipleProperties.second", not "multipleProperties.first.second"
    expect(result?.keyPath).toBe('multipleProperties.second')
  })

  it('should generate correct keyPath for sibling properties at root level', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-keypath-siblings.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside the "body" field
    const position = new Position(2, 15)
    const result = await detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('body')
    // Bug fix: keyPath should be "body", not "page.body"
    expect(result?.keyPath).toBe('body')
  })
})