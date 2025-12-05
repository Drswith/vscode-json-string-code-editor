import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node16',
  external: [
    'vscode',
  ],
  noExternal: [
    'jsonc-parser',
    'jsesc-es',
  ],
  outDir: 'out',
})
