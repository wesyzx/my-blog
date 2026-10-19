import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
if (!process.env.LIVESYNC_SOURCE_DIR || !process.env.PUBLISHER_BUILD_DIR) {
  throw new Error('LIVESYNC_SOURCE_DIR and PUBLISHER_BUILD_DIR are required')
}
const source = path.resolve(process.env.LIVESYNC_SOURCE_DIR)
const output = path.resolve(process.env.PUBLISHER_BUILD_DIR)
const dependency = path.join(source, 'node_modules/@vrtmrz/livesync-commonlib')
const installed = JSON.parse(await fs.readFile(path.join(dependency, 'package.json'), 'utf8'))
if (installed.version !== '0.1.42') throw new Error('Reader requires pinned Commonlib 0.1.42')
const { build } = await import(pathToFileURL(path.join(source, 'node_modules/esbuild/lib/main.js')).href)
await fs.mkdir(output, { recursive: true })
await build({
  entryPoints: [path.join(here, 'read-remote.mjs')],
  bundle: true, platform: 'node', target: 'node24', format: 'cjs',
  outfile: path.join(output, 'reader.cjs'),
  alias: {
    '@livesync/direct': path.join(dependency, 'dist/API/DirectFileManipulatorV2.js'),
    '@livesync/content': path.join(dependency, 'dist/common/utils.js'),
    yaml: path.join(repo, 'node_modules/yaml/dist/index.js'),
    'octagonal-wheels/common/logger': path.join(source, 'node_modules/octagonal-wheels/dist/common/logger.js'),
  },
  nodePaths: [path.join(source, 'node_modules')],
  define: { self: 'globalThis', nonInteractive: 'true' },
})
await build({
  entryPoints: [path.join(repo, 'scripts/obsidian-publish.mjs')],
  bundle: true, platform: 'node', target: 'node24', format: 'esm',
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  outfile: path.join(output, 'publish.mjs'),
})
console.log('Built pinned server reader and publisher bundles.')
