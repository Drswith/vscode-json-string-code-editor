/**
 * 语言到文件扩展名的映射
 */
const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rs',
  php: 'php',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  html: 'html',
  css: 'css',
  sql: 'sql',
  shellscript: 'sh',
  powershell: 'ps1',
  yaml: 'yml',
  xml: 'xml',
  markdown: 'md',
  plaintext: 'txt',
}

/**
 * 根据语言ID获取对应的文件扩展名
 * @param languageId 语言标识符
 * @returns 文件扩展名，如果未找到则返回'txt'
 */
export function getFileExtensionForLanguage(languageId: string): string {
  const normalizedLanguageId = languageId.toLowerCase().trim()
  return LANGUAGE_EXTENSION_MAP[normalizedLanguageId] || 'txt'
}

/**
 * 标准化语言标识符
 * @param languageId 原始语言标识符
 * @returns 标准化后的语言标识符
 */
export function normalizeLanguageId(languageId: string): string {
  if (!languageId || typeof languageId !== 'string') {
    return 'plaintext'
  }

  const normalized = languageId.toLowerCase().trim()

  // 常见别名映射
  const aliasMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'bash': 'shellscript',
    'sh': 'shellscript',
    'shell': 'shellscript',
    'docker': 'dockerfile',
    'golang': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'cs': 'csharp',
    'c++': 'cpp',
    'c#': 'csharp',
  }

  return aliasMap[normalized] || normalized
}
