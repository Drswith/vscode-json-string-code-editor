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
   * 显示增强的语言选择器
   * 包含图标、搜索和自动检测推荐功能
   * @param fieldName 字段名，用于语言检测
   * @param codeContent 代码内容，用于语言检测
   * @returns 选择的语言ID，如果用户取消则返回undefined
   */
  public static async showLanguageSelector(fieldName?: string, codeContent?: string): Promise<string | undefined> {
    // 获取所有已知的语言
    const languages = await vscode.languages.getLanguages()

    // 获取语言信息
    const languageInfos = languages.map(id => this.getLanguageInfo(id))

    // 进行语言自动检测
    let recommendedLanguage: string | undefined
    if (fieldName || codeContent) {
      recommendedLanguage = await this.detectLanguage(fieldName, codeContent)
    }

    // 创建快速选择项
    const quickPickItems = this.createQuickPickItems(languageInfos, recommendedLanguage)

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: '选择代码语言',
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: false,
      canPickMany: false,
    })

    if (selected && !selected.kind) {
      // 从label中提取语言ID（括号中的内容）
      const match = selected.label.match(/\(([^)]+)\)$/)
      const languageId = match ? match[1] : undefined

      if (languageId) {
        return languageId
      }
    }

    return undefined
  }

  /**
   * 自动检测语言
   * 使用并行检测多种语言，返回最先匹配到的语言
   */
  private static async detectLanguage(fieldName?: string, codeContent?: string): Promise<string | undefined> {
    const detectionPromises: Promise<LanguageDetectionResult | null>[] = []

    // 基于字段名的检测
    if (fieldName) {
      detectionPromises.push(this.detectLanguageFromFieldName(fieldName))
    }

    // 基于代码内容的检测
    if (codeContent) {
      detectionPromises.push(this.detectLanguageFromContent(codeContent))
    }

    try {
      // 使用 Promise.race 获取最先完成的检测结果
      const results = await Promise.allSettled(detectionPromises)

      // 找到第一个成功的检测结果
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
   * 基于字段名检测语言
   */
  private static async detectLanguageFromFieldName(fieldName: string): Promise<LanguageDetectionResult | null> {
    const fieldNameLower = fieldName.toLowerCase()

    // 字段名模式匹配
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
   * 基于代码内容检测语言
   */
  private static async detectLanguageFromContent(codeContent: string): Promise<LanguageDetectionResult | null> {
    const content = codeContent.trim()

    if (!content) {
      return null
    }

    // 内容模式匹配
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

      // CSS - 简化正则表达式避免回溯问题
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

    // 按置信度排序，优先返回高置信度的结果
    const sortedPatterns = patterns.sort((a, b) => b.confidence - a.confidence)

    for (const pattern of sortedPatterns) {
      if (pattern.regex.test(content)) {
        return { languageId: pattern.languageId, confidence: pattern.confidence }
      }
    }

    return null
  }

  /**
   * 创建快速选择项
   */
  private static createQuickPickItems(languageInfos: LanguageInfo[], recommendedLanguage?: string): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = []

    // 如果有推荐语言，添加推荐部分
    if (recommendedLanguage) {
      const recommendedInfo = languageInfos.find(info => info.id === recommendedLanguage)
      if (recommendedInfo) {
        items.push({
          label: '🎯 推荐语言',
          kind: vscode.QuickPickItemKind.Separator,
        })

        items.push({
          label: `${recommendedInfo.displayName} (${recommendedInfo.id})`,
          description: `${recommendedInfo.aliases.length > 0 ? recommendedInfo.aliases.join(', ') : ''} - 自动检测推荐`,
        })

        // 添加分隔符
        items.push({
          label: '所有语言',
          kind: vscode.QuickPickItemKind.Separator,
        })
      }
    }

    // 按流行度和名称排序所有语言
    const sortedLanguages = languageInfos.sort((a, b) => {
      // 先按流行度排序，再按名称排序
      if (a.popularity !== b.popularity) {
        return b.popularity - a.popularity
      }
      return a.displayName.localeCompare(b.displayName)
    })

    // 添加所有语言（排除已经在推荐中的语言）
    sortedLanguages.forEach((info) => {
      // 如果这个语言不是推荐语言，或者没有推荐语言，则添加
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
   * 获取语言信息
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
   * 获取语言图标
   */
  private static getLanguageIcon(languageId: string): string {
    const icons: Record<string, string> = {
      // 热门编程语言
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

      // Web 技术
      html: '🌐',
      css: '🎨',
      scss: '💅',
      sass: '💅',
      less: '💄',
      vue: '💚',
      react: '⚛️',
      angular: '🅰️',

      // 标记和数据格式
      markdown: '📝',
      json: '📋',
      jsonc: '📋',
      yaml: '📄',
      xml: '📰',
      toml: '📄',
      ini: '⚙️',
      properties: '🔧',

      // 脚本和配置
      shellscript: '🐚',
      bash: '🐚',
      powershell: '💙',
      dockerfile: '🐳',
      makefile: '🔨',
      bat: '🖥️',

      // 数据库和查询
      sql: '🗃️',

      // 其他
      plaintext: '📄',
      log: '📜',
      gitignore: '🚫',
    }

    return icons[languageId] || '📄'
  }

  /**
   * 获取语言别名（用于搜索）
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
   * 获取语言流行度（用于排序）
   */
  private static getLanguagePopularity(languageId: string): number {
    const popularity: Record<string, number> = {
      // 最热门的语言
      javascript: 100,
      typescript: 95,
      python: 90,
      java: 85,
      html: 80,
      css: 75,

      // 常用语言
      json: 70,
      markdown: 65,
      sql: 60,
      shellscript: 55,
      yaml: 50,

      // 编程语言
      csharp: 45,
      cpp: 40,
      go: 35,
      rust: 30,
      php: 25,
      ruby: 20,
      swift: 15,
      kotlin: 10,
      scala: 5,

      // 其他
      xml: 3,
      dockerfile: 2,
      powershell: 1,
    }

    return popularity[languageId] || 0
  }

  /**
   * 获取语言的友好显示名称
   * 将语言ID转换为更易读的名称
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
   * 检查语言ID是否有效
   */
  public static async isValidLanguage(languageId: string): Promise<boolean> {
    const languages = await vscode.languages.getLanguages()
    return languages.includes(languageId)
  }
}
