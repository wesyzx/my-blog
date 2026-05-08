import React from "react";

export default function AboutPage() {
  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        <h1
          className="text-[30px] font-bold mb-8 text-center"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          关于
        </h1>

        {/* 头像 + 介绍 */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10">
          <div
            className="w-[150px] h-[150px] rounded-full border-2 flex-shrink-0 overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-full h-full flex items-center justify-center text-white text-[48px] font-bold"
              style={{
                backgroundColor: 'var(--color-accent)',
                fontFamily: "Georgia, serif",
              }}
            >
              不
            </div>
          </div>

          <div className="text-[16px] leading-[1.8]" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="mb-4">
              你好，欢迎来到 <em style={{ color: 'var(--color-text-primary)' }}>不赶</em>。
            </p>

            <p className="mb-4">
              这里记录我的美食探访、生活日常和技术折腾。不赶时间，慢慢记录，用心感受。
            </p>

            <p className="italic" style={{ color: 'var(--color-text-muted)' }}>
              为食而生
            </p>
          </div>
        </div>

        <hr className="divider" />

        {/* 联系信息 */}
        <div className="mt-8">
          <h3
            className="text-[20px] font-bold mb-4"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            联系我
          </h3>
          <ul className="space-y-3 text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-accent)' }}>✉</span>
              <span>Email: </span>
              <a href="mailto:hi@bugan.com" className="hover:text-[var(--color-accent-hover)] transition-colors" style={{ color: 'var(--color-accent)' }}>
                hi@bugan.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-accent)' }}>◆</span>
              <span>GitHub: </span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-hover)] transition-colors" style={{ color: 'var(--color-accent)' }}>
                @bugan
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-accent)' }}>𝕏</span>
              <span>Twitter: </span>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-hover)] transition-colors" style={{ color: 'var(--color-accent)' }}>
                @bugan
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
