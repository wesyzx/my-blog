import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Keep standalone TypeScript modules testable on the project's Node 20 baseline.
export async function importTypeScript(url) {
  const source = await readFile(url, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: url.pathname,
  })
  const resolved = outputText.replace(/(from\s+['"])(\.[^'"]+)(['"])/g,
    (_, before, specifier, after) => `${before}${new URL(specifier, url).href}${after}`)
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
}
