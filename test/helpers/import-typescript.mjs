import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Keep standalone TypeScript modules testable on the project's Node 20 baseline.
export async function importTypeScript(url) {
  const source = await readFile(url, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: url.pathname,
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
