import * as vscode from 'vscode'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static instance: Logger
  private outputChannel: vscode.OutputChannel
  private logLevel: LogLevel = LogLevel.INFO

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('JSON String Code Editor')
    this.updateLogLevel()
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private updateLogLevel(): void {
    const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
    const level = config.get<string>('logLevel', 'info')

    switch (level) {
      case 'error':
        this.logLevel = LogLevel.ERROR
        break
      case 'warn':
        this.logLevel = LogLevel.WARN
        break
      case 'info':
        this.logLevel = LogLevel.INFO
        break
      case 'debug':
        this.logLevel = LogLevel.DEBUG
        break
      default:
        this.logLevel = LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
  }

  private log(level: LogLevel, message: string): void {
    if (!this.shouldLog(level)) {
      return
    }

    const timestamp = this.formatTimestamp()
    const levelStr = LogLevel[level]
    const logMessage = `[${timestamp}] [${levelStr}] ${message}`

    // 1. Output to Output Channel
    this.outputChannel.appendLine(logMessage)

    // 2. Output to Console
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.DEBUG:
        console.debug(logMessage)
        break
    }
  }

  public error(message: string, showMessage = false): void {
    this.log(LogLevel.ERROR, message)
    if (showMessage) {
      vscode.window.showErrorMessage(message)
    }
  }

  public warn(message: string, showMessage = false): void {
    this.log(LogLevel.WARN, message)
    if (showMessage) {
      vscode.window.showWarningMessage(message)
    }
  }

  public info(message: string, showMessage = false): void {
    this.log(LogLevel.INFO, message)
    if (showMessage) {
      vscode.window.showInformationMessage(message)
    }
  }

  public debug(message: string, showMessage = true): void {
    this.log(LogLevel.DEBUG, message)
    if (showMessage) {
      vscode.window.showInformationMessage(message)
    }
  }

  public show(): void {
    this.outputChannel.show()
  }

  public dispose(): void {
    this.outputChannel.dispose()
  }

  // Listen for configuration changes
  public onConfigurationChanged(): void {
    this.updateLogLevel()
  }
}

// Export singleton instance
export const logger = Logger.getInstance()
