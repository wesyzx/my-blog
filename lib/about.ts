import fs from 'fs'
import path from 'path'

const aboutPath = path.join(process.cwd(), 'content/about.md')

export function getAboutContent(): string {
  try {
    return fs.readFileSync(aboutPath, 'utf8')
  } catch {
    return ''
  }
}
