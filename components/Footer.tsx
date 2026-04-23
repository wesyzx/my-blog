export default function Footer() {
  return (
    <footer className="mt-[50px] bg-[#f3f4f7] border-t border-[#e7e9ef]">
      <div className="max-w-[1100px] mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div className="text-center md:text-left">
            <h3 className="text-[15px] font-bold text-[#293241] mb-3 uppercase tracking-wide">关于本站</h3>
            <p className="text-[13px] text-[#475671] leading-relaxed">
              不慌不忙，记录生活。分享技术、摄影、生活中的点滴感悟。
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-[#293241] mb-3 uppercase tracking-wide">快速链接</h3>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-[#475671]">
              <a href="/" className="hover:text-[#98c1d9] transition-colors">首页</a>
              <a href="/about" className="hover:text-[#98c1d9] transition-colors">关于</a>
              <a href="/gallery" className="hover:text-[#98c1d9] transition-colors">相册</a>
              <a href="/message" className="hover:text-[#98c1d9] transition-colors">留言</a>
            </div>
          </div>
          
          {/* Social */}
          <div className="text-center md:text-right">
            <h3 className="text-[15px] font-bold text-[#293241] mb-3 uppercase tracking-wide">关注我</h3>
            <div className="flex items-center justify-center md:justify-end gap-3 text-[16px] text-[#475671]">
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-[3px] bg-white hover:bg-[#98c1d9] hover:text-white transition-all shadow-sm" aria-label="Twitter">𝕏</a>
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-[3px] bg-white hover:bg-[#98c1d9] hover:text-white transition-all shadow-sm" aria-label="Instagram">📷</a>
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-[3px] bg-white hover:bg-[#98c1d9] hover:text-white transition-all shadow-sm" aria-label="GitHub">⌘</a>
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-[3px] bg-white hover:bg-[#98c1d9] hover:text-white transition-all shadow-sm" aria-label="RSS">RSS</a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-[#e7e9ef] pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[#616d80]">
          <p>
            Copyright © {new Date().getFullYear()} The Unhurried. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span>Powered by</span>
            <a href="https://nextjs.org" className="font-semibold text-[#98c1d9] hover:text-[#7db9de] transition-colors">Next.js</a>
          </p>
        </div>
      </div>
    </footer>
  )
}