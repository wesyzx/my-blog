import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const output = path.resolve(root, '../../artifacts/blog-create')
const { build } = await import(process.env.ESBUILD_MODULE_PATH
  ? pathToFileURL(process.env.ESBUILD_MODULE_PATH).href : 'esbuild')
await fs.mkdir(output, { recursive: true })
await build({
  entryPoints: [path.join(root, 'main.js')],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2018',
  external: ['obsidian'],
  outfile: path.join(output, 'main.js'),
})
for (const name of ['styles.css', 'manifest.json', 'README.md']) {
  await fs.copyFile(path.join(root, name), path.join(output, name))
}
console.log(`Built single-file Obsidian plugin: ${output}`)
