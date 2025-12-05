import * as os from 'node:os'
import * as vscode from 'vscode'
import { logger } from './logger'
import { getTempDirectoryUri } from './tempUtils'

// Lazy-loaded modules to improve activation time
let CodeDetector: typeof import('./codeDetector').CodeDetector
let CodeEditorProvider: typeof import('./codeEditorProvider').CodeEditorProvider
let LanguageSelector: typeof import('./languageSelector').LanguageSelector
let shouldProcessFile: typeof import('./fileUtils').shouldProcessFile

// Lazy-initialized instances
let detector: InstanceType<typeof CodeDetector> | null = null
let editorProvider: InstanceType<typeof CodeEditorProvider> | null = null

/**
 * Lazily load and initialize CodeDetector
 */
async function getDetector() {
  if (!detector) {
    if (!CodeDetector) {
      const module = await import('./codeDetector')
      CodeDetector = module.CodeDetector
    }
    detector = new CodeDetector()
  }
  return detector
}

/**
 * Lazily load and initialize CodeEditorProvider
 */
async function getEditorProvider() {
  if (!editorProvider) {
    if (!CodeEditorProvider) {
      const module = await import('./codeEditorProvider')
      CodeEditorProvider = module.CodeEditorProvider
    }
    editorProvider = new CodeEditorProvider()
  }
  return editorProvider
}

/**
 * Lazily load LanguageSelector
 */
async function getLanguageSelector() {
  if (!LanguageSelector) {
    const module = await import('./languageSelector')
    LanguageSelector = module.LanguageSelector
  }
  return LanguageSelector
}

/**
 * Lazily load shouldProcessFile
 */
async function getShouldProcessFile() {
  if (!shouldProcessFile) {
    const module = await import('./fileUtils')
    shouldProcessFile = module.shouldProcessFile
  }
  return shouldProcessFile
}

export function activate(context: vscode.ExtensionContext) {
  logger.info('JSON String Code Editor extension is being activated')

  // Listen for configuration changes (lightweight, no lazy loading needed)
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('vscode-json-string-code-editor')) {
      logger.onConfigurationChanged()
    }
  })

  // Listen for document save events to sync temporary file changes to original JSON file
  // Only initialize editorProvider when actually needed
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    // Quick check before lazy loading - avoid unnecessary imports
    if (!document.uri.fsPath.includes('vscode-json-string-code-editor')
      || !document.uri.fsPath.includes(os.tmpdir())) {
      return
    }
    logger.info(`Temporary file saved: ${document.uri.fsPath}`)
    const provider = await getEditorProvider()
    await provider.saveCodeToOriginal(document)
  })

  // Register command: edit code
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

      // Lazy load detector and editorProvider
      const [currentDetector, currentEditorProvider, LangSelector] = await Promise.all([
        getDetector(),
        getEditorProvider(),
        getLanguageSelector(),
      ])

      // Detect if current position contains code
      const codeInfo = await currentDetector.detectCodeAtPosition(document, position)
      if (!codeInfo) {
        logger.info('No code detected at current position')
        vscode.window.showInformationMessage('No code string detected at current position')
        return
      }

      // Check if editor already exists for this key
      const hasExisting = currentEditorProvider.hasExistingEditor(document.uri.fsPath, codeInfo.keyPath)
      if (hasExisting) {
        logger.info('Existing editor found, reusing without language selection')
        // Directly reuse existing editor, no need for language selection
        await currentEditorProvider.openCodeEditor(codeInfo, document)
        return
      }

      // Show language selection menu, pass field name and code content for auto-detection
      const selectedLanguage = await LangSelector.showLanguageSelector(codeInfo.fieldName, codeInfo.code)
      if (!selectedLanguage) {
        logger.info('User cancelled language selection')
        return
      }

      logger.info(`User selected language: ${selectedLanguage}`)

      // Create code block info with language information
      const codeInfoWithLanguage = {
        ...codeInfo,
        language: selectedLanguage,
      }

      // Open temporary editor
      await currentEditorProvider.openCodeEditor(codeInfoWithLanguage, document)
    },
  )

  // Register range edit command
  const editCodeAtRangeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editCodeAtRange',
    async (documentUri: string, blockInfo: any) => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      // Lazy load shouldProcessFile
      const processFileCheck = await getShouldProcessFile()

      // Check if file should be processed (including file type and include configuration)
      if (!processFileCheck(editor.document)) {
        return
      }

      // Lazy load editorProvider
      const currentEditorProvider = await getEditorProvider()

      // blockInfo is already in CodeBlockInfo format, use directly
      await currentEditorProvider.openCodeEditor(blockInfo, editor.document)
    },
  )

  // Register cleanup temporary files command
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.cleanupTempFiles',
    async () => {
      try {
        // Get temporary file directory path
        const tmpDirUri = getTempDirectoryUri()

        // Check if temporary directory exists
        try {
          await vscode.workspace.fs.stat(tmpDirUri)
        }
        catch {
          logger.info('No temporary files to clean up')
          return
        }

        // Recursively delete all files in temporary directory
        const deleteCount = await deleteTempFiles(tmpDirUri)

        logger.info(`Cleaned up ${deleteCount} temporary files`)
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to clean up temporary files: ${errorMessage}`)
      }
    },
  )

  // Helper function to clean up temporary files
  async function deleteTempFiles(dirUri: vscode.Uri): Promise<number> {
    let deleteCount = 0

    try {
      // Read directory contents
      const entries = await vscode.workspace.fs.readDirectory(dirUri)

      for (const [name, type] of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, name)

        if (type === vscode.FileType.Directory) {
          // Recursively delete subdirectories
          deleteCount += await deleteTempFiles(entryUri)
          await vscode.workspace.fs.delete(entryUri, { recursive: false })
        }
        else {
          // Delete file
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
  // Clean up logging service
  logger.dispose()
  logger.info('JSON String Code Editor extension deactivated')
}
