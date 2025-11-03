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
  keyPath: string // Complete JSON key path, e.g. "config.database.script"
  language?: string // Optional language identifier
}

export class CodeDetector {
  constructor() {
    // Removed configuration-related initialization
  }

  async detectCodeAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<CodeBlockInfo | null> {
    const text = document.getText()
    const offset = document.offsetAt(position)

    try {
      // Use jsonc-parser to parse JSON, supports comments and fault tolerance
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        return await this.findCodeInObjectWithAST(text, offset, document)
      }

      // If parsing fails, try partial parsing
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
    const pathStack: string[] = [] // Used to track JSON path
    const pendingDetections: Array<{ fieldName: string, value: string, valueOffset: number, valueLength: number, fullPath: string }> = []

    const visitor: JSONVisitor = {
      onObjectBegin: () => {
        // Reset when entering object
      },
      onObjectProperty: (property: string) => {
        currentProperty = property
        pathStack.push(property)
      },
      onObjectEnd: () => {
        // Pop path stack when exiting object
        if (pathStack.length > 0) {
          pathStack.pop()
        }
        currentProperty = null
      },
      onArrayBegin: () => {
        // Enter array
      },
      onArrayEnd: () => {
        // Clean up array indices in path stack when exiting array
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

    // Check which detected code block contains the target offset
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
    // Use regular expression to find string values
    const stringRegex = /"(?:[^"\\]|\\.)*"/g
    let match: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while ((match = stringRegex.exec(text)) !== null) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length

      // Check if offset is within this string
      if (offset >= matchStart && offset <= matchEnd) {
        // Try to find field name
        const beforeString = text.substring(0, matchStart)
        const fieldMatch = beforeString.match(/"([^"]+)"\s*:\s*$/)

        if (fieldMatch) {
          const fieldName = fieldMatch[1]

          if (this.isCodeField(fieldName)) {
            const stringValue = match[0].slice(1, -1) // Remove quotes
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
    // Now supports all string fields because users can select language
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
          // Handle Unicode escape sequences \uXXXX
          const nextFour = str.substr(str.indexOf(match) + 2, 4)
          if (/^[0-9a-f]{4}$/i.test(nextFour)) {
            return String.fromCharCode(Number.parseInt(nextFour, 16))
          }
          return char
        }
        case 'x': {
          // Handle hexadecimal escape sequences \xXX
          const nextTwo = str.substr(str.indexOf(match) + 2, 2)
          if (/^[0-9a-f]{2}$/i.test(nextTwo)) {
            return String.fromCharCode(Number.parseInt(nextTwo, 16))
          }
          return char
        }
        case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
          // Handle octal escape sequences \ooo
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
