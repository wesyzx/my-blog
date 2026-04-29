import React from "react";

export default function AboutPage() {
  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        <h1
          className="text-[30px] font-bold mb-8 text-center"
          style={{
            color: 'var(--color-heading)',
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
                backgroundColor: 'var(--color-primary)',
                fontFamily: "Georgia, serif",
              }}
            >
              J
            </div>
          </div>

          <div className="text-[16px] leading-[1.8]" style={{ color: 'var(--color-body)' }}>
            <p className="mb-4">
              你好，我是 <strong style={{ color: 'var(--color-heading)' }}>阿杰（Jack）</strong>。
              <br />
              欢迎来到我的个人博客 <em style={{ color: 'var(--color-heading)' }}>Jack&apos;s Space</em>。
            </p>

            <p className="mb-4">
              这里记录了我的日常生活、折腾的技术心得、随手拍摄的照片，以及学习过程中的点滴感悟。
              博客始建于 2022 年上海封控期间，最初只是想找点事情分散注意力，没想到一直坚持到了现在。
            </p>

            <p className="italic" style={{ color: 'var(--color-muted)' }}>
              Everything happens for the best.
            </p>
          </div>
        </div>

        <hr className="divider" />

        {/* 联系信息 */}
        <div className="mt-8">
          <h3
            className="text-[20px] font-bold mb-4"
            style={{
              color: 'var(--color-heading)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            联系我
          </h3>
          <ul className="space-y-3 text-[15px]" style={{ color: 'var(--color-body)' }}>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-primary)' }}>✉</span>
              <span>Email: </span>
              <a href="mailto:hi@veryjack.com" className="hover:text-[var(--color-primary-hover)] transition-colors" style={{ color: 'var(--color-primary)' }}>
                hi@veryjack.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-primary)' }}>◆</span>
              <span>GitHub: </span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-primary-hover)] transition-colors" style={{ color: 'var(--color-primary)' }}>
                @veryjack
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 text-center" style={{ color: 'var(--color-primary)' }}>𝕏</span>
              <span>Twitter: </span>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-primary-hover)] transition-colors" style={{ color: 'var(--color-primary)' }}>
                @veryjack
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
