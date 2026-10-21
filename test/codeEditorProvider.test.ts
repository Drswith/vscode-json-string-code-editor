import * as fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Position, Uri, window, workspace } from 'vscode'
import { CodeDetector } from '../src/codeDetector'
import { CodeEditorProvider } from '../src/codeEditorProvider'

describe('save temporary editor back to original JSON', () => {
  const originalUri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
  const tempFiles: string[] = []

  beforeEach(() => {
    vi.mocked(workspace.applyEdit).mockResolvedValue(true)
    vi.spyOn(window, 'showErrorMessage')
  })

  afterEach(() => {
    for (const file of tempFiles.splice(0)) {
      fs.rmSync(file, { force: true })
    }
    ;(workspace as any).textDocuments = []
    ;(workspace as any).setWorkspaceFolders(undefined)
    vi.mocked(workspace.asRelativePath).mockReset()
    vi.mocked(workspace.applyEdit).mockReset()
    vi.restoreAllMocks()
  })

  /**
   * Open a temporary editor for the "config.script" field, write new code into
   * the temporary file and return the saved temporary document
   */
  async function editScriptField(provider: CodeEditorProvider, newCode: string) {
    const originalDocument = await workspace.openTextDocument(originalUri)
    ;(workspace as any).textDocuments = [originalDocument]

    const codeInfo = await new CodeDetector().detectCodeAtPosition(originalDocument, new Position(2, 20))
    expect(codeInfo?.keyPath).toBe('config.script')

    const showTextDocument = vi.spyOn(window, 'showTextDocument')
    await provider.openCodeEditor({ ...codeInfo!, language: 'javascript' }, originalDocument)
    const tempUri = (showTextDocument.mock.calls[0][0] as any).uri as Uri
    tempFiles.push(tempUri.fsPath)

    fs.writeFileSync(tempUri.fsPath, newCode, 'utf8')
    return workspace.openTextDocument(tempUri)
  }

  function getWrittenJson() {
    expect(window.showErrorMessage).not.toHaveBeenCalled()
    expect(workspace.applyEdit).toHaveBeenCalledTimes(1)
    const edit = vi.mocked(workspace.applyEdit).mock.calls[0][0]
    const [textEdit] = edit.get(originalUri)
    return JSON.parse(textEdit.newText)
  }

  it('should save back without a workspace folder', async () => {
    const provider = new CodeEditorProvider()
    const tempDocument = await editScriptField(provider, 'console.log(\'updated\');')

    await provider.saveCodeToOriginal(tempDocument)

    expect(getWrittenJson().config.script).toBe('console.log(\'updated\');')
  })

  it('should save back when the JSON file is outside the first workspace folder', async () => {
    ;(workspace as any).setWorkspaceFolders([
      { uri: Uri.file('/some/other/project'), name: 'project', index: 0 },
    ])
    vi.mocked(workspace.asRelativePath).mockImplementation((p: any) => typeof p === 'string' ? p : p.fsPath)

    const provider = new CodeEditorProvider()
    const tempDocument = await editScriptField(provider, 'console.log(\'outside\');')

    await provider.saveCodeToOriginal(tempDocument)

    expect(getWrittenJson().config.script).toBe('console.log(\'outside\');')
  })

  it('should save back when the relative path uses different separators than the workspace folder', async () => {
    // Simulate Windows: asRelativePath() returns forward slashes,
    // which never matched the backslash-separated fsPath of the document
    ;(workspace as any).setWorkspaceFolders([
      { uri: Uri.file(process.cwd()), name: 'project', index: 0 },
    ])
    vi.mocked(workspace.asRelativePath).mockReturnValue('examples\\test-right-click.json')

    const provider = new CodeEditorProvider()
    const tempDocument = await editScriptField(provider, 'console.log(\'windows\');')

    await provider.saveCodeToOriginal(tempDocument)

    expect(getWrittenJson().config.script).toBe('console.log(\'windows\');')
  })

  it('should report an error when the original document is no longer open', async () => {
    const provider = new CodeEditorProvider()
    const tempDocument = await editScriptField(provider, 'console.log(\'closed\');')
    ;(workspace as any).textDocuments = []

    await provider.saveCodeToOriginal(tempDocument)

    expect(window.showErrorMessage).toHaveBeenCalledWith('Cannot find original document')
    expect(workspace.applyEdit).not.toHaveBeenCalled()
  })
})
