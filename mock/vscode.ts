import { createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'

const vscode = createVSCodeMock(vi)

// 扩展mock以支持workspace配置
const mockConfiguration = {
  get: vi.fn((key: string, defaultValue?: any) => {
    if (key === 'recentLanguages') {
      return []
    }
    return defaultValue
  }),
  update: vi.fn().mockResolvedValue(undefined),
  has: vi.fn().mockReturnValue(true),
  inspect: vi.fn().mockReturnValue({}),
}

// 添加workspace mock
vscode.workspace = {
  ...vscode.workspace,
  getConfiguration: vi.fn().mockReturnValue(mockConfiguration),
}

// 添加QuickPickItemKind mock
;(vscode as any).QuickPickItemKind = {
  Separator: -1,
  Default: 0,
}

export default vscode
