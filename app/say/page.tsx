import React from "react";

interface Say {
  id: number;
  content: string;
  date: string;
  likes: number;
  pinned?: boolean;
}

const says: Say[] = []

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function SayPage() {
  return (
    <div className="max-w-[700px] mx-auto">
      <div className="card p-[30px] md:p-[40px]">
        <h1 className="text-[30px] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          说说
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-muted)' }}>
          一些零碎的思考和日常
        </p>

        <div className="space-y-0">
          {says.map((say) => (
            <div
              key={say.id}
              className="py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <p className="text-[15px] leading-[1.75] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {say.content}
              </p>
              <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--color-text-hint)' }}>
                <div className="flex items-center gap-3">
                  <span>{say.date}</span>
                  {say.pinned && (
                    <span className="tag text-[11px]">置顶</span>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  {say.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
