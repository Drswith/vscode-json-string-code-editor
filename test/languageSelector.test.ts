import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { LanguageSelector } from '../src/languageSelector'

// 使用我们的完整 VS Code mock
vi.mock('vscode', async () => {
  const mockModule = await import('../mock/vscode')
  return mockModule.default
})

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get languages from VSCode API', async () => {
    const mockLanguages = ['javascript', 'typescript', 'python', 'java']
    vi.mocked(vscode.languages.getLanguages).mockResolvedValue(mockLanguages)
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: 'JavaScript (javascript)',
      description: 'js, node, nodejs, JavaScript, JS - 自动检测推荐',
    })

    const result = await LanguageSelector.showLanguageSelector('test_field', 'console.log("hello")')

    expect(vscode.languages.getLanguages).toHaveBeenCalled()
    expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'JavaScript (javascript)',
          description: 'js, node, nodejs, JavaScript, JS - 自动检测推荐',
        }),
      ]),
      expect.objectContaining({
        placeHolder: '选择代码语言',
        matchOnDescription: true,
        matchOnDetail: true,
        ignoreFocusOut: false,
        canPickMany: false,
      })
    )
    expect(result).toBe('javascript')
  })

  it('should return undefined when user cancels selection', async () => {
    const mockLanguages = ['javascript', 'typescript']
    vi.mocked(vscode.languages.getLanguages).mockResolvedValue(mockLanguages)
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined)

    const result = await LanguageSelector.showLanguageSelector('test_field', 'some code')

    expect(result).toBeUndefined()
  })

  it('should validate language correctly', async () => {
    const mockLanguages = ['javascript', 'typescript', 'python']
    vi.mocked(vscode.languages.getLanguages).mockResolvedValue(mockLanguages)

    const isValidJs = await LanguageSelector.isValidLanguage('javascript')
    const isValidInvalid = await LanguageSelector.isValidLanguage('invalid-lang')

    expect(isValidJs).toBe(true)
    expect(isValidInvalid).toBe(false)
  })

  it('should sort languages by popularity and name', async () => {
    const mockLanguages = ['typescript', 'javascript', 'python', 'java']
    vi.mocked(vscode.languages.getLanguages).mockResolvedValue(mockLanguages)
    vi.mocked(vscode.window.showQuickPick).mockImplementation((items) => {
      // 验证语言是否按流行度和名称排序
      const sortedItems = items as vscode.QuickPickItem[]
      const languageItems = sortedItems.filter(item => !item.kind)
      // 从label中提取语言ID（括号中的内容）
      const languageIds = languageItems.map(item => {
        const match = item.label.match(/\(([^)]+)\)$/)
        return match ? match[1] : ''
      }).filter(id => id) // 过滤掉空字符串

      // JavaScript 和 TypeScript 应该排在前面（流行度高）
      // 然后是 Python 和 Java（按字母顺序）
      expect(languageIds).toEqual(['javascript', 'typescript', 'python', 'java'])
      return Promise.resolve(undefined)
    })

    await LanguageSelector.showLanguageSelector('test_field', 'some code')
  })

  it('should detect language automatically and show as recommended', async () => {
    const mockLanguages = ['javascript', 'typescript', 'python', 'java']
    vi.mocked(vscode.languages.getLanguages).mockResolvedValue(mockLanguages)
    vi.mocked(vscode.window.showQuickPick).mockImplementation((items) => {
      const sortedItems = items as vscode.QuickPickItem[]
      // 第一项应该是推荐语言的分隔符
      expect(sortedItems[0].label).toBe('🎯 推荐语言')
      // 第二项应该是推荐的JavaScript语言
      expect(sortedItems[1].label).toContain('JavaScript')
      expect(sortedItems[1].label).toContain('javascript')
      expect(sortedItems[1].description).toContain('自动检测推荐')
      return Promise.resolve(undefined)
    })

    // 传递JavaScript代码，应该被自动检测
    await LanguageSelector.showLanguageSelector('script', 'function test() { console.log("hello"); }')
  })
 })
