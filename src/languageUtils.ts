/**
 * Language to file extension mapping
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
 * Get corresponding file extension based on language ID
 * @param languageId Language identifier
 * @returns File extension, returns 'txt' if not found
 */
export function getFileExtensionForLanguage(languageId: string): string {
  const normalizedLanguageId = languageId.toLowerCase().trim()
  return LANGUAGE_EXTENSION_MAP[normalizedLanguageId] || 'txt'
}

/**
 * Normalize language identifier
 * @param languageId Original language identifier
 * @returns Normalized language identifier
 */
export function normalizeLanguageId(languageId: string): string {
  if (!languageId || typeof languageId !== 'string') {
    return 'plaintext'
  }

  const normalized = languageId.toLowerCase().trim()

  // Common alias mapping
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
