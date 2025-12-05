import type { CodeBlockInfo } from './codeDetector'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'
import { getFileExtensionForLanguage, normalizeLanguageId } from './languageUtils'

interface EditorInfo {
  document: vscode.TextDocument
  editor: vscode.TextEditor
  originalCode: string
  codeBlockInfo: CodeBlockInfo
  uniqueKey: string // Unique key: filename + JSON key path
  safeFileName: string // Safe short filename for temp file
}

export class CodeEditorProvider {
  private activeEditors: Map<string, EditorInfo> = new Map()
  private singletonEditor: EditorInfo | null = null

  /**
   * Generate unique key based on filename and JSON key path
   */
  private generateUniqueKey(filePath: string, keyPath: string): string {
    const fileName = vscode.workspace.asRelativePath(filePath)
    return `${fileName}::${keyPath}`
  }

  /**
   * Generate safe short filename for temp file
   * Uses hash to ensure uniqueness while keeping filename short
   */
  private generateSafeFileName(uniqueKey: string, keyPath: string): string {
    // Get the last part of the key path (field name)
    const parts = keyPath.split('.')
    const lastPart = parts[parts.length - 1] || 'code'

    // Create a short hash of the uniqueKey for uniqueness
    const hash = crypto.createHash('md5').update(uniqueKey).digest('hex').substring(0, 8)

    // Sanitize the last part (only keep alphanumeric and underscore)
    const safePart = lastPart.replace(/\W/g, '_').substring(0, 30)

    // Return a safe filename: fieldName_hash (max ~40 chars)
    return `${safePart}_${hash}`
  }

  /**
   * Check if editor for specified key value already exists
   */
  hasExistingEditor(filePath: string, keyPath: string): boolean {
    const uniqueKey = this.generateUniqueKey(filePath, keyPath)
    const existingEditor = this.activeEditors.get(uniqueKey)

    // Check if editor is still valid (document not closed)
    if (existingEditor && !existingEditor.document.isClosed) {
      return true
    }

    // If editor is closed, clean up cache
    if (existingEditor && existingEditor.document.isClosed) {
      this.activeEditors.delete(uniqueKey)
      if (this.singletonEditor === existingEditor) {
        this.singletonEditor = null
      }
    }

    return false
  }

  /**
   * Open code editor
   */
  async openCodeEditor(codeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument): Promise<void> {
    const uniqueKey = this.generateUniqueKey(originalDocument.uri.fsPath, codeBlockInfo.keyPath)

    console.log(`[CodeEditor] Attempting to open editor, unique key: ${uniqueKey}`)

    // Check if editor for this key already exists
    const existingEditor = this.activeEditors.get(uniqueKey)
    if (existingEditor) {
      console.log(`[CodeEditor] Found existing editor, reusing and updating content`)
      await this.updateExistingEditor(existingEditor, codeBlockInfo, originalDocument)
      return
    }

    // Create new temporary editor
    console.log(`[CodeEditor] Creating new temporary editor`)
    await this.createNewEditor(codeBlockInfo, originalDocument, uniqueKey)
  }

  /**
   * Create new editor
   */
  private async createNewEditor(codeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument, uniqueKey: string): Promise<void> {
    // Normalize language identifier, use plaintext if no language info
    const normalizedLanguage = normalizeLanguageId(codeBlockInfo.language || 'plaintext')

    // Get correct file extension
    const fileExtension = getFileExtensionForLanguage(normalizedLanguage)

    // Create real temporary file instead of untitled document
    const tempDir = os.tmpdir()
    // Generate safe short filename to avoid ENAMETOOLONG error
    const safeFileName = this.generateSafeFileName(uniqueKey, codeBlockInfo.keyPath)
    const tempFileName = `${safeFileName}.${fileExtension}`
    const tempFilePath = path.join(tempDir, 'vscode-json-string-code-editor', tempFileName)

    // Ensure temporary directory exists
    const tempDirPath = path.dirname(tempFilePath)
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true })
    }

    // Write to temporary file
    fs.writeFileSync(tempFilePath, codeBlockInfo.code, 'utf8')

    const tempUri = vscode.Uri.file(tempFilePath)
    const tempDocument = await vscode.workspace.openTextDocument(tempUri)

    const editor = await vscode.window.showTextDocument(tempDocument, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
    })

    const editorInfo: EditorInfo = {
      document: tempDocument,
      editor,
      originalCode: codeBlockInfo.code,
      codeBlockInfo,
      uniqueKey,
      safeFileName,
    }

    // Store editor information
    this.activeEditors.set(uniqueKey, editorInfo)
    this.singletonEditor = editorInfo

    // Update status bar
    this.updateStatusBar(editorInfo, originalDocument)

    // Listen for document close event
    const disposable = vscode.workspace.onDidCloseTextDocument((closedDoc) => {
      if (closedDoc === tempDocument) {
        console.log(`[CodeEditor] Temporary editor closed, unique key: ${uniqueKey}`)
        this.activeEditors.delete(uniqueKey)
        if (this.singletonEditor === editorInfo) {
          this.singletonEditor = null
        }
        disposable.dispose()
      }
    })

    console.log(`[CodeEditor] New editor created successfully, unique key: ${uniqueKey}`)
  }

  /**
   * Update existing editor
   */
  private async updateExistingEditor(editorInfo: EditorInfo, newCodeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument): Promise<void> {
    const { document: tempDocument, editor } = editorInfo

    // Check if editor is still valid (document not closed)
    if (tempDocument.isClosed) {
      console.log(`[CodeEditor] Editor document is closed, removing from cache`)
      this.activeEditors.delete(editorInfo.uniqueKey)
      if (this.singletonEditor === editorInfo) {
        this.singletonEditor = null
      }
      // Recreate editor
      await this.createNewEditor(newCodeBlockInfo, originalDocument, editorInfo.uniqueKey)
      return
    }

    // Check if content needs updating
    const currentContent = tempDocument.getText()
    const newContent = newCodeBlockInfo.code

    if (currentContent !== newContent) {
      console.log(`[CodeEditor] Content has changed, updating editor content`)

      // Update temporary document content
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        tempDocument.positionAt(0),
        tempDocument.positionAt(tempDocument.getText().length),
      )
      edit.replace(tempDocument.uri, fullRange, newContent)
      await vscode.workspace.applyEdit(edit)

      // Update stored original code and code block info
      editorInfo.originalCode = newContent
      editorInfo.codeBlockInfo = newCodeBlockInfo
    }
    else {
      console.log(`[CodeEditor] Content unchanged, no update needed`)
    }

    // Update status bar
    this.updateStatusBar(editorInfo, originalDocument)

    // Check if editor is current active editor
    const isActive = vscode.window.activeTextEditor === editor
    if (!isActive) {
      console.log(`[CodeEditor] Editor is not current active editor, focusing to editor`)
      await vscode.window.showTextDocument(tempDocument, {
        viewColumn: vscode.ViewColumn.Beside, // Always open in right panel
        preview: false,
        preserveFocus: false,
      })
    }
    else {
      console.log(`[CodeEditor] Editor is already active editor, checking if in correct panel position`)
      // Even if editor is active, ensure it's in right panel
      if (editor.viewColumn !== vscode.ViewColumn.Beside && editor.viewColumn !== vscode.ViewColumn.Two) {
        console.log(`[CodeEditor] Editor not in right panel, moving to right panel`)
        await vscode.window.showTextDocument(tempDocument, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
          preserveFocus: false,
        })
      }
    }
  }

  /**
   * Update status bar
   */
  private updateStatusBar(editorInfo: EditorInfo, originalDocument: vscode.TextDocument): void {
    const fileName = vscode.workspace.asRelativePath(originalDocument.uri.fsPath)
    const keyPath = editorInfo.codeBlockInfo.keyPath
    const language = editorInfo.codeBlockInfo.language || 'plaintext'

    vscode.window.setStatusBarMessage(
      `Editing: ${fileName} -> ${keyPath} (${language})`,
      5000,
    )
  }

  /**
   * Save code to original document
   */
  async saveCodeToOriginal(tempDocument: vscode.TextDocument): Promise<void> {
    // Extract filename from temporary file path
    const tempFilePath = tempDocument.uri.fsPath
    const tempFileNameWithExt = path.basename(tempFilePath)
    const tempFileName = path.parse(tempFileNameWithExt).name

    // Find corresponding editor info by safeFileName
    let targetEditorInfo: EditorInfo | null = null
    for (const editorInfo of this.activeEditors.values()) {
      if (tempFileName === editorInfo.safeFileName) {
        targetEditorInfo = editorInfo
        break
      }
    }

    if (!targetEditorInfo) {
      console.log('[CodeEditor] Could not find corresponding editor info, temp file name:', tempFileName)
      return
    }

    const newCode = tempDocument.getText()
    const { codeBlockInfo } = targetEditorInfo

    // Find original document
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    const relativePath = targetEditorInfo.uniqueKey.split('::')[0]
    const fullPath = workspaceFolder ? `${workspaceFolder}/${relativePath}` : relativePath

    const originalDocument = vscode.workspace.textDocuments.find(doc =>
      doc.uri.fsPath === fullPath,
    )

    if (!originalDocument) {
      vscode.window.showErrorMessage('Cannot find original document')
      return
    }

    try {
      // Get complete content of original document
      const originalText = originalDocument.getText()

      // Parse JSON to maintain format
      const jsonObject = JSON.parse(originalText)

      // Update corresponding value based on keyPath
      this.updateJsonValueByPath(jsonObject, codeBlockInfo.keyPath, newCode)

      // Reformat JSON, maintain indentation
      const formattedJson = JSON.stringify(jsonObject, null, 2)

      // Apply changes to original document
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        originalDocument.positionAt(0),
        originalDocument.positionAt(originalText.length),
      )
      edit.replace(originalDocument.uri, fullRange, formattedJson)

      const success = await vscode.workspace.applyEdit(edit)
      if (success) {
        // Update stored original code
        targetEditorInfo.originalCode = newCode
        vscode.window.showInformationMessage('Code saved to original file')
      }
      else {
        vscode.window.showErrorMessage('Save failed')
      }
    }
    catch (error) {
      console.error('[CodeEditor] JSON parsing or save failed:', error)
      vscode.window.showErrorMessage(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update value in JSON object based on path
   */
  private updateJsonValueByPath(obj: any, keyPath: string, newValue: string): void {
    const keys = keyPath.split('.')
    let current = obj

    // Navigate to target object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (current[key] === undefined) {
        current[key] = {}
      }
      current = current[key]
    }

    // Set final value
    const finalKey = keys[keys.length - 1]
    current[finalKey] = newValue
  }

  /**
   * Escape string
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  /**
   * Get current active editor info
   */
  getCurrentEditorInfo(): EditorInfo | null {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) {
      return null
    }

    for (const editorInfo of this.activeEditors.values()) {
      if (editorInfo.editor === activeEditor) {
        return editorInfo
      }
    }

    return null
  }

  /**
   * Clean up all editors
   */
  dispose(): void {
    this.activeEditors.clear()
    this.singletonEditor = null
  }
}
