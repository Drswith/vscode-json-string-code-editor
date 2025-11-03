import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    alias: {
      vscode: resolve(__dirname, './mock/vscode.ts'),
    },
    reporters: ['default', 'html'],
    coverage: {
      enabled: true,
      include: [
        'mock/vscode.ts',
        'src/**.{ts,tsx}',
      ],
    },
    outputFile: 'dist/vitest/index.html',
  },
})
