import * as vscode from 'vscode'

interface LanguageInfo {
  id: string
  displayName: string
  icon: string
  aliases: string[]
  popularity: number
}

interface LanguageDetectionResult {
  languageId: string
  confidence: number
}

export class LanguageSelector {
  /**
   * Show enhanced language selector
   * Includes icons, search and auto-detection recommendation features
   * @param fieldName Field name for language detection
   * @param codeContent Code content for language detection
   * @returns Selected language ID, returns undefined if user cancels
   */
  public static async showLanguageSelector(fieldName?: string, codeContent?: string): Promise<string | undefined> {
    // Get all known languages
    const languages = await vscode.languages.getLanguages()

    // Get language information
    const languageInfos = languages.map(id => this.getLanguageInfo(id))

    // Perform automatic language detection
    let recommendedLanguage: string | undefined
    if (fieldName || codeContent) {
      recommendedLanguage = await this.detectLanguage(fieldName, codeContent)
    }

    // Create quick pick items
    const quickPickItems = this.createQuickPickItems(languageInfos, recommendedLanguage)

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select code language',
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: false,
      canPickMany: false,
    })

    if (selected && !selected.kind) {
      // Extract language ID from label (content in parentheses)
      const match = selected.label.match(/\(([^)]+)\)$/)
      const languageId = match ? match[1] : undefined

      if (languageId) {
        return languageId
      }
    }

    return undefined
  }

  /**
   * Auto-detect language
   * Use parallel detection for multiple languages, return the first matched language
   */
  private static async detectLanguage(fieldName?: string, codeContent?: string): Promise<string | undefined> {
    const detectionPromises: Promise<LanguageDetectionResult | null>[] = []

    // Field name based detection
    if (fieldName) {
      detectionPromises.push(this.detectLanguageFromFieldName(fieldName))
    }

    // Code content based detection
    if (codeContent) {
      detectionPromises.push(this.detectLanguageFromContent(codeContent))
    }

    try {
      // Use Promise.race to get the first completed detection result
      const results = await Promise.allSettled(detectionPromises)

      // Find the first successful detection result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value.languageId
        }
      }
    }
    catch (error) {
      console.warn('Language detection failed:', error)
    }

    return undefined
  }

  /**
   * Detect language based on field name
   */
  private static async detectLanguageFromFieldName(fieldName: string): Promise<LanguageDetectionResult | null> {
    const fieldNameLower = fieldName.toLowerCase()

    // Field name pattern matching
    const patterns: Record<string, string[]> = {
      javascript: ['js', 'javascript', 'script', 'node', 'react', 'vue'],
      typescript: ['ts', 'typescript'],
      python: ['py', 'python', 'script'],
      java: ['java'],
      csharp: ['cs', 'csharp', 'dotnet'],
      cpp: ['cpp', 'c++', 'cxx'],
      c: ['c'],
      go: ['go', 'golang'],
      rust: ['rs', 'rust'],
      php: ['php'],
      ruby: ['rb', 'ruby'],
      swift: ['swift'],
      kotlin: ['kt', 'kotlin'],
      scala: ['scala'],
      html: ['html', 'htm', 'template', 'markup'],
      css: ['css', 'style', 'styles'],
      scss: ['scss', 'sass'],
      less: ['less'],
      sql: ['sql', 'query', 'database', 'db'],
      json: ['json', 'config', 'configuration'],
      yaml: ['yaml', 'yml', 'config'],
      xml: ['xml'],
      markdown: ['md', 'markdown', 'readme'],
      shellscript: ['sh', 'shell', 'bash', 'script'],
      powershell: ['ps1', 'powershell'],
      dockerfile: ['docker', 'dockerfile'],
      plaintext: ['text', 'txt', 'plain'],
    }

    for (const [languageId, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => fieldNameLower.includes(keyword))) {
        return { languageId, confidence: 0.8 }
      }
    }

    return null
  }

  /**
   * Detect language from content
   */
  private static async detectLanguageFromContent(codeContent: string): Promise<LanguageDetectionResult | null> {
    const content = codeContent.trim()

    if (!content) {
      return null
    }

    // Content pattern matching
    const patterns: Array<{ regex: RegExp, languageId: string, confidence: number }> = [
      // JavaScript/TypeScript
      { regex: /\b(function|const|let|var|=>|console\.log|require|import|export)\b/, languageId: 'javascript', confidence: 0.9 },
      { regex: /\b(interface|type|enum|namespace|as\s+\w+|:\s*\w+\[\])\b/, languageId: 'typescript', confidence: 0.95 },

      // Python
      { regex: /\b(def|import|from|print|if\s+__name__|class\s+\w+:)\b/, languageId: 'python', confidence: 0.9 },
      { regex: /^\s*#.*python/i, languageId: 'python', confidence: 0.95 },

      // Java
      { regex: /\b(public\s+class|private\s+\w+|System\.out\.println|@Override)\b/, languageId: 'java', confidence: 0.9 },

      // C#
      { regex: /\b(using\s+System|namespace\s+\w+|Console\.WriteLine|public\s+static\s+void\s+Main)\b/, languageId: 'csharp', confidence: 0.9 },

      // C/C++
      { regex: /\b(#include|printf|cout|std::|malloc|free)\b/, languageId: 'cpp', confidence: 0.85 },
      { regex: /\b(int\s+main|#include\s*<stdio\.h>)\b/, languageId: 'c', confidence: 0.9 },

      // Go
      { regex: /\b(package\s+main|func\s+main|fmt\.Print|import\s+"fmt")\b/, languageId: 'go', confidence: 0.9 },

      // Rust
      { regex: /\b(fn\s+main|println!|use\s+std::|let\s+mut)\b/, languageId: 'rust', confidence: 0.9 },

      // PHP
      { regex: /^<\?php|\$\w+|echo\s+|print\s+/, languageId: 'php', confidence: 0.9 },

      // Ruby
      { regex: /\b(def\s+\w+|puts\s+|require\s+|class\s+\w+\s*<)\b/, languageId: 'ruby', confidence: 0.85 },

      // HTML
      { regex: /<\/?[a-z][\s\S]*>/i, languageId: 'html', confidence: 0.9 },

      // CSS - Simplified regex to avoid backtracking issues
      { regex: /@media|@import|@keyframes|color\s*:|background\s*:|margin\s*:|padding\s*:/, languageId: 'css', confidence: 0.9 },

      // SQL
      { regex: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE\s+TABLE)\b/i, languageId: 'sql', confidence: 0.9 },

      // JSON
      { regex: /^\s*[{[][\s\S]*[}\]]\s*$/, languageId: 'json', confidence: 0.8 },

      // YAML
      { regex: /^[\w-]+:[\w\s-]+$/m, languageId: 'yaml', confidence: 0.8 },

      // Shell Script
      { regex: /^#!/, languageId: 'shellscript', confidence: 0.95 },
      { regex: /\b(echo|grep|awk|sed|chmod|mkdir)\b/, languageId: 'shellscript', confidence: 0.8 },

      // PowerShell
      { regex: /\b(Get-\w+|Set-\w+|Write-Host|\$\w+\s*=)\b/, languageId: 'powershell', confidence: 0.9 },

      // Dockerfile
      { regex: /^(FROM|RUN|COPY|ADD|WORKDIR|EXPOSE|CMD|ENTRYPOINT)\b/m, languageId: 'dockerfile', confidence: 0.95 },
    ]

    // Sort by confidence, prioritize high confidence results
    const sortedPatterns = patterns.sort((a, b) => b.confidence - a.confidence)

    for (const pattern of sortedPatterns) {
      if (pattern.regex.test(content)) {
        return { languageId: pattern.languageId, confidence: pattern.confidence }
      }
    }

    return null
  }

  /**
   * Create quick pick items
   */
  private static createQuickPickItems(languageInfos: LanguageInfo[], recommendedLanguage?: string): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = []

    // If there's a recommended language, add the recommendation section
    if (recommendedLanguage) {
      const recommendedInfo = languageInfos.find(info => info.id === recommendedLanguage)
      if (recommendedInfo) {
        items.push({
          label: '🎯 Recommended Language',
          kind: vscode.QuickPickItemKind.Separator,
        })

        items.push({
          label: `${recommendedInfo.displayName} (${recommendedInfo.id})`,
          description: `${recommendedInfo.aliases.length > 0 ? recommendedInfo.aliases.join(', ') : ''} - Auto-detected recommendation`,
        })

        // Add separator
        items.push({
          label: 'All Languages',
          kind: vscode.QuickPickItemKind.Separator,
        })
      }
    }

    // Sort all languages by popularity and name
    const sortedLanguages = languageInfos.sort((a, b) => {
      // Sort by popularity first, then by name
      if (a.popularity !== b.popularity) {
        return b.popularity - a.popularity
      }
      return a.displayName.localeCompare(b.displayName)
    })

    // Add all languages (excluding those already in recommendations)
    sortedLanguages.forEach((info) => {
      // Add if this language is not the recommended one, or if there's no recommended language
      if (!recommendedLanguage || info.id !== recommendedLanguage) {
        items.push({
          label: `${info.displayName} (${info.id})`,
          description: info.aliases.length > 0 ? info.aliases.join(', ') : undefined,
        })
      }
    })

    return items
  }

  /**
   * Get language information
   */
  private static getLanguageInfo(languageId: string): LanguageInfo {
    const displayName = this.getLanguageDisplayName(languageId)
    const icon = this.getLanguageIcon(languageId)
    const aliases = this.getLanguageAliases(languageId)
    const popularity = this.getLanguagePopularity(languageId)

    return {
      id: languageId,
      displayName,
      icon,
      aliases,
      popularity,
    }
  }

  /**
   * Get language icon
   */
  private static getLanguageIcon(languageId: string): string {
    const icons: Record<string, string> = {
      // Popular programming languages
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      csharp: '🔷',
      cpp: '⚡',
      c: '🔧',
      go: '🐹',
      rust: '🦀',
      php: '🐘',
      ruby: '💎',
      swift: '🦉',
      kotlin: '🎯',
      scala: '🎭',

      // Web technologies
      html: '🌐',
      css: '🎨',
      scss: '💅',
      sass: '💅',
      less: '💄',
      vue: '💚',
      react: '⚛️',
      angular: '🅰️',

      // Markup and data formats
      markdown: '📝',
      json: '📋',
      jsonc: '📋',
      yaml: '📄',
      xml: '📰',
      toml: '📄',
      ini: '⚙️',
      properties: '🔧',

      // Scripts and configuration
      shellscript: '🐚',
      bash: '🐚',
      powershell: '💙',
      dockerfile: '🐳',
      makefile: '🔨',
      bat: '🖥️',

      // Database and query
      sql: '🗃️',

      // Others
      plaintext: '📄',
      log: '📜',
      gitignore: '🚫',
    }

    return icons[languageId] || '📄'
  }

  /**
   * Get language aliases (for search)
   */
  private static getLanguageAliases(languageId: string): string[] {
    const aliases: Record<string, string[]> = {
      javascript: ['js', 'node', 'nodejs', 'JavaScript', 'JS'],
      typescript: ['ts', 'TypeScript', 'TS'],
      python: ['py', 'Python', 'python3'],
      java: ['Java'],
      csharp: ['c#', 'C#', 'dotnet', '.net'],
      cpp: ['c++', 'C++', 'cxx'],
      c: ['C'],
      go: ['golang', 'Go'],
      rust: ['rs', 'Rust'],
      php: ['PHP'],
      ruby: ['rb', 'Ruby'],
      swift: ['Swift'],
      kotlin: ['kt', 'Kotlin'],
      scala: ['Scala'],
      html: ['HTML', 'htm'],
      css: ['CSS'],
      scss: ['SCSS', 'sass'],
      less: ['Less'],
      markdown: ['md', 'Markdown'],
      json: ['JSON'],
      jsonc: ['JSON with Comments'],
      yaml: ['yml', 'YAML'],
      xml: ['XML'],
      sql: ['SQL', 'mysql', 'postgresql', 'sqlite'],
      shellscript: ['shell', 'sh', 'bash'],
      powershell: ['ps1', 'PowerShell'],
      dockerfile: ['Docker'],
      plaintext: ['text', 'txt'],
    }

    return aliases[languageId] || []
  }

  /**
   * Get language popularity (for sorting)
   */
  private static getLanguagePopularity(languageId: string): number {
    const popularity: Record<string, number> = {
      // Most popular languages
      javascript: 100,
      typescript: 95,
      python: 90,
      java: 85,
      html: 80,
      css: 75,

      // Common languages
      json: 70,
      markdown: 65,
      sql: 60,
      shellscript: 55,
      yaml: 50,

      // Programming languages
      csharp: 45,
      cpp: 40,
      go: 35,
      rust: 30,
      php: 25,
      ruby: 20,
      swift: 15,
      kotlin: 10,
      scala: 5,

      // Others
      xml: 3,
      dockerfile: 2,
      powershell: 1,
    }

    return popularity[languageId] || 0
  }

  /**
   * Get the friendly display name of a language
   * Convert language ID to a more readable name
   */
  private static getLanguageDisplayName(languageId: string): string {
    const displayNames: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      csharp: 'C#',
      cpp: 'C++',
      c: 'C',
      go: 'Go',
      rust: 'Rust',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      scala: 'Scala',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      less: 'Less',
      sql: 'SQL',
      shellscript: 'Shell Script',
      powershell: 'PowerShell',
      yaml: 'YAML',
      xml: 'XML',
      json: 'JSON',
      jsonc: 'JSON with Comments',
      markdown: 'Markdown',
      plaintext: 'Plain Text',
      dockerfile: 'Dockerfile',
      makefile: 'Makefile',
      bat: 'Batch',
      ini: 'INI',
      toml: 'TOML',
      properties: 'Properties',
      gitignore: 'Git Ignore',
      log: 'Log',
    }

    return displayNames[languageId] || languageId.charAt(0).toUpperCase() + languageId.slice(1)
  }

  /**
   * Check if language ID is valid
   */
  public static async isValidLanguage(languageId: string): Promise<boolean> {
    const languages = await vscode.languages.getLanguages()
    return languages.includes(languageId)
  }
}
