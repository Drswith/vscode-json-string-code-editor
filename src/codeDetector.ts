import type { JSONVisitor, ParseError } from 'jsonc-parser'
import { parseTree, visit } from 'jsonc-parser'
import * as vscode from 'vscode'
import { logger } from './logger'

export interface CodeBlockInfo {
  code: string
  start: number
  end: number
  range: vscode.Range
  fieldName: string
  keyPath: string // 完整的 JSON 键名路径，如 "config.database.script"
  language?: string // 可选的语言标识符
}

export class CodeDetector {
  constructor() {
    // 移除了配置相关的初始化
  }

  async detectCodeAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<CodeBlockInfo | null> {
    const text = document.getText()
    const offset = document.offsetAt(position)

    try {
      // 使用jsonc-parser解析JSON，支持注释和容错
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        return await this.findCodeInObjectWithAST(text, offset, document)
      }

      // 如果解析失败，尝试部分解析
      return await this.findCodeInPartialJson(text, offset, document)
    }
    catch (error) {
      logger.error(`Error detecting code at position: ${error}`)
      return null
    }
  }

  private async findCodeInObjectWithAST(text: string, offset: number, document: vscode.TextDocument): Promise<CodeBlockInfo | null> {
    let result: CodeBlockInfo | null = null
    let currentProperty: string | null = null
    const pathStack: string[] = [] // 用于追踪 JSON 路径
    const pendingDetections: Array<{ fieldName: string, value: string, valueOffset: number, valueLength: number, fullPath: string }> = []

    const visitor: JSONVisitor = {
      onObjectBegin: () => {
        // 进入对象时重置
      },
      onObjectProperty: (property: string) => {
        currentProperty = property
        pathStack.push(property)
      },
      onObjectEnd: () => {
        // 退出对象时弹出路径栈
        if (pathStack.length > 0) {
          pathStack.pop()
        }
        currentProperty = null
      },
      onArrayBegin: () => {
        // 进入数组
      },
      onArrayEnd: () => {
        // 退出数组时清理路径栈中的数组索引
        while (pathStack.length > 0 && pathStack[pathStack.length - 1].startsWith('[')) {
          pathStack.pop()
        }
      },
      onLiteralValue: (value: any, valueOffset: number, valueLength: number) => {
        if (typeof value === 'string' && currentProperty && this.isCodeField(currentProperty)) {
          const fullPath = pathStack.join('.')
          pendingDetections.push({
            fieldName: currentProperty,
            value,
            valueOffset,
            valueLength,
            fullPath,
          })
        }
      },
    }

    visit(text, visitor)

    // 检查哪个检测到的代码块包含目标偏移量
    for (const detection of pendingDetections) {
      const { fieldName, value, valueOffset, valueLength, fullPath } = detection

      if (offset >= valueOffset && offset <= valueOffset + valueLength) {
        const unescapedCode = this.unescapeString(value)
        const range = new vscode.Range(
          document.positionAt(valueOffset),
          document.positionAt(valueOffset + valueLength),
        )

        result = {
          code: unescapedCode,
          start: valueOffset,
          end: valueOffset + valueLength,
          range,
          fieldName,
          keyPath: fullPath,
        }
        break
      }
    }

    return result
  }

  private async findCodeInPartialJson(text: string, offset: number, document: vscode.TextDocument): Promise<CodeBlockInfo | null> {
    // 使用正则表达式查找字符串值
    const stringRegex = /"(?:[^"\\]|\\.)*"/g
    let match: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while ((match = stringRegex.exec(text)) !== null) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length

      // 检查偏移量是否在这个字符串内
      if (offset >= matchStart && offset <= matchEnd) {
        // 尝试找到字段名
        const beforeString = text.substring(0, matchStart)
        const fieldMatch = beforeString.match(/"([^"]+)"\s*:\s*$/)

        if (fieldMatch) {
          const fieldName = fieldMatch[1]

          if (this.isCodeField(fieldName)) {
            const stringValue = match[0].slice(1, -1) // 移除引号
            const unescapedCode = this.unescapeString(stringValue)
            const range = new vscode.Range(
              document.positionAt(matchStart),
              document.positionAt(matchEnd),
            )

            return {
              code: unescapedCode,
              start: matchStart,
              end: matchEnd,
              range,
              fieldName,
              keyPath: fieldName,
            }
          }
        }
      }
    }

    return null
  }

  private isCodeField(_fieldName: string): boolean {
    // 现在支持所有字符串字段，因为用户可以选择语言
    return true
  }

  private unescapeString(str: string): string {
    return str.replace(/\\(.)/g, (match, char) => {
      switch (char) {
        case '"': return '"'
        case '\\': return '\\'
        case '/': return '/'
        case 'b': return '\b'
        case 'f': return '\f'
        case 'n': return '\n'
        case 'r': return '\r'
        case 't': return '\t'
        case 'u': {
          // 处理Unicode转义序列 \uXXXX
          const nextFour = str.substr(str.indexOf(match) + 2, 4)
          if (/^[0-9a-f]{4}$/i.test(nextFour)) {
            return String.fromCharCode(Number.parseInt(nextFour, 16))
          }
          return char
        }
        case 'x': {
          // 处理十六进制转义序列 \xXX
          const nextTwo = str.substr(str.indexOf(match) + 2, 2)
          if (/^[0-9a-f]{2}$/i.test(nextTwo)) {
            return String.fromCharCode(Number.parseInt(nextTwo, 16))
          }
          return char
        }
        case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
          // 处理八进制转义序列 \ooo
          const octal = match.substr(1)
          if (/^[0-7]{1,3}$/.test(octal)) {
            return String.fromCharCode(Number.parseInt(octal, 8))
          }
          return char
        }
        default: return char
      }
    })
  }
}
