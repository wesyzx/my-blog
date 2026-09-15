import type { ReactNode } from 'react'

const TOKEN = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g

function inlineMarkdown(text: string): ReactNode[] {
  const output: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) output.push(text.slice(cursor, match.index))
    if (match[2] && match[3]) {
      output.push(<a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer">{match[2]}</a>)
    } else if (match[4]) {
      output.push(<strong key={match.index}>{match[4]}</strong>)
    } else if (match[5]) {
      output.push(<code key={match.index}>{match[5]}</code>)
    }
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) output.push(text.slice(cursor))
  return output
}

export default function SafeMarkdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/).filter(Boolean)

  return <div className="safe-markdown">{blocks.map((block, index) => {
    const lines = block.split('\n')
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>)}</ul>
    }
    return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{inlineMarkdown(line)}{lineIndex < lines.length - 1 && <br />}</span>)}</p>
  })}</div>
}
