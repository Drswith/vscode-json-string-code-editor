import type { CodeBlockInfo } from './codeDetector'
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
  uniqueKey: string // 唯一键：文件名+JSON键路径
}

export class CodeEditorProvider {
  private activeEditors: Map<string, EditorInfo> = new Map()
  private singletonEditor: EditorInfo | null = null

  /**
   * 生成唯一键，基于文件名和JSON键路径
   */
  private generateUniqueKey(filePath: string, keyPath: string): string {
    const fileName = vscode.workspace.asRelativePath(filePath)
    return `${fileName}::${keyPath}`
  }

  /**
   * 检查是否已存在指定键值的编辑器
   */
  hasExistingEditor(filePath: string, keyPath: string): boolean {
    const uniqueKey = this.generateUniqueKey(filePath, keyPath)
    const existingEditor = this.activeEditors.get(uniqueKey)

    // 检查编辑器是否仍然有效（文档未关闭）
    if (existingEditor && !existingEditor.document.isClosed) {
      return true
    }

    // 如果编辑器已关闭，清理缓存
    if (existingEditor && existingEditor.document.isClosed) {
      this.activeEditors.delete(uniqueKey)
      if (this.singletonEditor === existingEditor) {
        this.singletonEditor = null
      }
    }

    return false
  }

  /**
   * 打开代码编辑器
   */
  async openCodeEditor(codeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument): Promise<void> {
    const uniqueKey = this.generateUniqueKey(originalDocument.uri.fsPath, codeBlockInfo.keyPath)

    console.log(`[CodeEditor] 尝试打开编辑器，唯一键: ${uniqueKey}`)

    // 检查是否已存在该键的编辑器
    const existingEditor = this.activeEditors.get(uniqueKey)
    if (existingEditor) {
      console.log(`[CodeEditor] 发现已存在的编辑器，复用并更新内容`)
      await this.updateExistingEditor(existingEditor, codeBlockInfo, originalDocument)
      return
    }

    // 创建新的临时编辑器
    console.log(`[CodeEditor] 创建新的临时编辑器`)
    await this.createNewEditor(codeBlockInfo, originalDocument, uniqueKey)
  }

  /**
   * 创建新的编辑器
   */
  private async createNewEditor(codeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument, uniqueKey: string): Promise<void> {
    // 标准化语言标识符，如果没有语言信息则使用plaintext
    const normalizedLanguage = normalizeLanguageId(codeBlockInfo.language || 'plaintext')

    // 获取正确的文件扩展名
    const fileExtension = getFileExtensionForLanguage(normalizedLanguage)

    // 创建真实的临时文件而不是untitled文档
    const tempDir = os.tmpdir()
    // 使用uniqueKey生成文件名，确保同一个键值使用相同的临时文件
    const safeUniqueKey = uniqueKey.replace(/\W/g, '_')
    const tempFileName = `${safeUniqueKey}.${fileExtension}`
    const tempFilePath = path.join(tempDir, 'vscode-json-string-code-editor', tempFileName)

    // 确保临时目录存在
    const tempDirPath = path.dirname(tempFilePath)
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true })
    }

    // 写入临时文件
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
    }

    // 存储编辑器信息
    this.activeEditors.set(uniqueKey, editorInfo)
    this.singletonEditor = editorInfo

    // 更新状态栏
    this.updateStatusBar(editorInfo, originalDocument)

    // 监听文档关闭事件
    const disposable = vscode.workspace.onDidCloseTextDocument((closedDoc) => {
      if (closedDoc === tempDocument) {
        console.log(`[CodeEditor] 临时编辑器已关闭，唯一键: ${uniqueKey}`)
        this.activeEditors.delete(uniqueKey)
        if (this.singletonEditor === editorInfo) {
          this.singletonEditor = null
        }
        disposable.dispose()
      }
    })

    console.log(`[CodeEditor] 新编辑器创建完成，唯一键: ${uniqueKey}`)
  }

  /**
   * 更新现有编辑器
   */
  private async updateExistingEditor(editorInfo: EditorInfo, newCodeBlockInfo: CodeBlockInfo, originalDocument: vscode.TextDocument): Promise<void> {
    const { document: tempDocument, editor } = editorInfo

    // 检查编辑器是否仍然有效（文档是否已关闭）
    if (tempDocument.isClosed) {
      console.log(`[CodeEditor] 编辑器文档已关闭，从缓存中移除`)
      this.activeEditors.delete(editorInfo.uniqueKey)
      if (this.singletonEditor === editorInfo) {
        this.singletonEditor = null
      }
      // 重新创建编辑器
      await this.createNewEditor(newCodeBlockInfo, originalDocument, editorInfo.uniqueKey)
      return
    }

    // 检查内容是否需要更新
    const currentContent = tempDocument.getText()
    const newContent = newCodeBlockInfo.code

    if (currentContent !== newContent) {
      console.log(`[CodeEditor] 内容已变化，更新编辑器内容`)

      // 更新临时文档内容
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        tempDocument.positionAt(0),
        tempDocument.positionAt(tempDocument.getText().length),
      )
      edit.replace(tempDocument.uri, fullRange, newContent)
      await vscode.workspace.applyEdit(edit)

      // 更新存储的原始代码和代码块信息
      editorInfo.originalCode = newContent
      editorInfo.codeBlockInfo = newCodeBlockInfo
    }
    else {
      console.log(`[CodeEditor] 内容未变化，无需更新`)
    }

    // 更新状态栏
    this.updateStatusBar(editorInfo, originalDocument)

    // 检查编辑器是否为当前活动编辑器
    const isActive = vscode.window.activeTextEditor === editor
    if (!isActive) {
      console.log(`[CodeEditor] 编辑器不是当前活动编辑器，聚焦到编辑器`)
      await vscode.window.showTextDocument(tempDocument, {
        viewColumn: vscode.ViewColumn.Beside, // 始终在右侧面板打开
        preview: false,
        preserveFocus: false,
      })
    }
    else {
      console.log(`[CodeEditor] 编辑器已是当前活动编辑器，检查是否在正确的面板位置`)
      // 即使编辑器是活动的，也要确保它在右侧面板
      if (editor.viewColumn !== vscode.ViewColumn.Beside && editor.viewColumn !== vscode.ViewColumn.Two) {
        console.log(`[CodeEditor] 编辑器不在右侧面板，移动到右侧面板`)
        await vscode.window.showTextDocument(tempDocument, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
          preserveFocus: false,
        })
      }
    }
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(editorInfo: EditorInfo, originalDocument: vscode.TextDocument): void {
    const fileName = vscode.workspace.asRelativePath(originalDocument.uri.fsPath)
    const keyPath = editorInfo.codeBlockInfo.keyPath
    const language = editorInfo.codeBlockInfo.language || 'plaintext'

    vscode.window.setStatusBarMessage(
      `正在编辑: ${fileName} -> ${keyPath} (${language})`,
      5000,
    )
  }

  /**
   * 保存代码到原始文档
   */
  async saveCodeToOriginal(tempDocument: vscode.TextDocument): Promise<void> {
    // 从临时文件路径中提取唯一键
    const tempFilePath = tempDocument.uri.fsPath
    const tempFileNameWithExt = path.basename(tempFilePath)
    const tempFileName = path.parse(tempFileNameWithExt).name

    // 查找对应的编辑器信息
    let targetEditorInfo: EditorInfo | null = null
    for (const [uniqueKey, editorInfo] of this.activeEditors.entries()) {
      const safeUniqueKey = uniqueKey.replace(/\W/g, '_')
      if (tempFileName === safeUniqueKey) {
        targetEditorInfo = editorInfo
        break
      }
    }

    if (!targetEditorInfo) {
      console.log('[CodeEditor] 未找到对应的编辑器信息，临时文件名:', tempFileName)
      return
    }

    const newCode = tempDocument.getText()
    const { codeBlockInfo } = targetEditorInfo

    // 查找原始文档
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    const relativePath = targetEditorInfo.uniqueKey.split('::')[0]
    const fullPath = workspaceFolder ? `${workspaceFolder}/${relativePath}` : relativePath

    const originalDocument = vscode.workspace.textDocuments.find(doc =>
      doc.uri.fsPath === fullPath,
    )

    if (!originalDocument) {
      vscode.window.showErrorMessage('无法找到原始文档')
      return
    }

    try {
      // 获取原始文档的完整内容
      const originalText = originalDocument.getText()

      // 解析 JSON 以保持格式
      const jsonObject = JSON.parse(originalText)

      // 根据 keyPath 更新对应的值
      this.updateJsonValueByPath(jsonObject, codeBlockInfo.keyPath, newCode)

      // 重新格式化 JSON，保持缩进
      const formattedJson = JSON.stringify(jsonObject, null, 2)

      // 应用更改到原始文档
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        originalDocument.positionAt(0),
        originalDocument.positionAt(originalText.length),
      )
      edit.replace(originalDocument.uri, fullRange, formattedJson)

      const success = await vscode.workspace.applyEdit(edit)
      if (success) {
        // 更新存储的原始代码
        targetEditorInfo.originalCode = newCode
        vscode.window.showInformationMessage('代码已保存到原始文件')
      }
      else {
        vscode.window.showErrorMessage('保存失败')
      }
    }
    catch (error) {
      console.error('[CodeEditor] JSON 解析或保存失败:', error)
      vscode.window.showErrorMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 根据路径更新 JSON 对象中的值
   */
  private updateJsonValueByPath(obj: any, keyPath: string, newValue: string): void {
    const keys = keyPath.split('.')
    let current = obj

    // 导航到目标对象
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (current[key] === undefined) {
        current[key] = {}
      }
      current = current[key]
    }

    // 设置最终值
    const finalKey = keys[keys.length - 1]
    current[finalKey] = newValue
  }

  /**
   * 转义字符串
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
   * 获取当前活动的编辑器信息
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
   * 清理所有编辑器
   */
  dispose(): void {
    this.activeEditors.clear()
    this.singletonEditor = null
  }
}
