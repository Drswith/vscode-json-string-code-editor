import * as os from 'node:os'
import * as vscode from 'vscode'
import { CodeDetector } from './codeDetector'
import { CodeEditorProvider } from './codeEditorProvider'
import { shouldProcessFile } from './fileUtils'
import { LanguageSelector } from './languageSelector'
import { logger } from './logger'
import { getTempDirectoryUri } from './tempUtils'

export function activate(context: vscode.ExtensionContext) {
  logger.info('JSON String Code Editor extension is being activated')

  const detector = new CodeDetector()

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('vscode-json-string-code-editor')) {
      logger.onConfigurationChanged()
    }
  })

  const editorProvider = new CodeEditorProvider()

  // 监听文档保存事件，用于同步临时文件更改到原始JSON文件
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    // 检查是否是临时文件
    if (document.uri.fsPath.includes('vscode-json-string-code-editor')
      && document.uri.fsPath.includes(os.tmpdir())) {
      logger.info(`Temporary file saved: ${document.uri.fsPath}`)
      await editorProvider.saveCodeToOriginal(document)
    }
  })

  // 注册命令：编辑代码
  const editCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editCode',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        logger.error('No active editor found')
        return
      }

      const document = editor.document
      const selection = editor.selection
      const position = selection.active

      // 检测当前位置是否包含代码
      const codeInfo = await detector.detectCodeAtPosition(document, position)
      if (!codeInfo) {
        logger.info('No code detected at current position')
        vscode.window.showInformationMessage('当前位置未检测到代码字符串')
        return
      }

      // 检查是否已存在该键值的编辑器
      const hasExisting = editorProvider.hasExistingEditor(document.uri.fsPath, codeInfo.keyPath)
      if (hasExisting) {
        logger.info('Existing editor found, reusing without language selection')
        // 直接复用已存在的编辑器，不需要语言选择
        await editorProvider.openCodeEditor(codeInfo, document)
        return
      }

      // 显示语言选择菜单，传递字段名和代码内容用于自动检测
      const selectedLanguage = await LanguageSelector.showLanguageSelector(codeInfo.fieldName, codeInfo.code)
      if (!selectedLanguage) {
        logger.info('User cancelled language selection')
        return
      }

      logger.info(`User selected language: ${selectedLanguage}`)

      // 创建带有语言信息的代码块信息
      const codeInfoWithLanguage = {
        ...codeInfo,
        language: selectedLanguage,
      }

      // 打开临时编辑器
      await editorProvider.openCodeEditor(codeInfoWithLanguage, document)
    },
  )

  // 注册范围编辑命令
  const editCodeAtRangeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editCodeAtRange',
    async (documentUri: string, blockInfo: any) => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      // 检查文件是否应该被处理（包括文件类型和include配置）
      if (!shouldProcessFile(editor.document)) {
        return
      }

      // blockInfo 已经是 CodeBlockInfo 格式，直接使用
      await editorProvider.openCodeEditor(blockInfo, editor.document)
    },
  )

  // 注册清理临时文件命令
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.cleanupTempFiles',
    async () => {
      try {
        // 获取临时文件目录路径
        const tmpDirUri = getTempDirectoryUri()

        // 检查临时目录是否存在
        try {
          await vscode.workspace.fs.stat(tmpDirUri)
        }
        catch {
          logger.info('No temporary files to clean up')
          return
        }

        // 递归删除临时目录中的所有文件
        const deleteCount = await deleteTempFiles(tmpDirUri)

        logger.info(`Cleaned up ${deleteCount} temporary files`)
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to clean up temporary files: ${errorMessage}`)
      }
    },
  )

  // 清理临时文件的辅助函数
  async function deleteTempFiles(dirUri: vscode.Uri): Promise<number> {
    let deleteCount = 0

    try {
      // 读取目录内容
      const entries = await vscode.workspace.fs.readDirectory(dirUri)

      for (const [name, type] of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, name)

        if (type === vscode.FileType.Directory) {
          // 递归删除子目录
          deleteCount += await deleteTempFiles(entryUri)
          await vscode.workspace.fs.delete(entryUri, { recursive: false })
        }
        else {
          // 删除文件
          await vscode.workspace.fs.delete(entryUri)
          deleteCount++
        }
      }

      return deleteCount
    }
    catch (error) {
      logger.error(`Failed to delete files in directory ${dirUri.fsPath}: ${error}`)
      return deleteCount
    }
  }

  context.subscriptions.push(
    editCodeCommand,
    editCodeAtRangeCommand,
    cleanupTempFilesCommand,
    configChangeListener,
    saveListener,
  )
}

export function deactivate() {
  // 清理日志服务
  logger.dispose()
  logger.info('JSON String Code Editor extension deactivated')
}
