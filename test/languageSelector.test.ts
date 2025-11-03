import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { LanguageSelector } from '../src/languageSelector'

// Use our complete VS Code mock
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
      description: 'js, node, nodejs, JavaScript, JS - Auto-detected recommendation',
    })

    const result = await LanguageSelector.showLanguageSelector('test_field', 'console.log("hello")')

    expect(vscode.languages.getLanguages).toHaveBeenCalled()
    expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'JavaScript (javascript)',
          description: 'js, node, nodejs, JavaScript, JS - Auto-detected recommendation',
        }),
      ]),
      expect.objectContaining({
        placeHolder: 'Select code language',
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
      // Verify languages are sorted by popularity and name
      const sortedItems = items as vscode.QuickPickItem[]
      const languageItems = sortedItems.filter(item => !item.kind)
      // Extract language ID from label (content in parentheses)
      const languageIds = languageItems.map(item => {
        const match = item.label.match(/\(([^)]+)\)$/)
        return match ? match[1] : ''
      }).filter(id => id) // Filter out empty strings

      // JavaScript and TypeScript should be at the front (high popularity)
      // Then Python and Java (alphabetical order)
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
      // First item should be the recommended language separator
      expect(sortedItems[0].label).toBe('🎯 Recommended Language')
      // Second item should be the recommended JavaScript language
      expect(sortedItems[1].label).toContain('JavaScript')
      expect(sortedItems[1].label).toContain('javascript')
      expect(sortedItems[1].description).toContain('Auto-detected recommendation')
      return Promise.resolve(undefined)
    })

    // Pass JavaScript code, should be auto-detected
    await LanguageSelector.showLanguageSelector('script', 'function test() { console.log("hello"); }')
  })
 })
