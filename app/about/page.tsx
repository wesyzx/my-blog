import React from "react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="bg-white rounded-[5px] p-[30px] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)]">
      <h1 className="text-[30px] font-bold mb-[30px] text-[#293241]">关于</h1>
      
      <div className="prose prose-slate max-w-none text-[#475671]">
        <p className="text-[16px] leading-[1.65] mb-6">
          你好，我是 <strong className="text-[#293241]">Can Chou</strong>。<br/>
          欢迎来到我的个人自留地 <em className="text-[#293241]">The Unhurried</em>。
        </p>

        <p className="text-[16px] leading-[1.65] mb-6">
          这里记录了我的日常生活、折腾的技术心得、随手拍摄的照片，以及学习过程中的点滴感悟。
          在这个快节奏的时代里，我希望能够“不慌不忙”地去体验生活，记录下那些微小但确切的幸福。
        </p>

        <hr className="my-[30px] border-[#e7e9ef]" />

        <h3 className="text-[20px] font-bold text-[#293241] mb-4">联系我</h3>
        <ul className="list-disc pl-5 text-[16px] space-y-2">
          <li>Email: <a href="mailto:hi@example.com" className="text-[#98c1d9] hover:text-[#7db9de] transition-colors">hi@example.com</a></li>
          <li>GitHub: <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#98c1d9] hover:text-[#7db9de] transition-colors">@canchou</a></li>
          <li>Twitter: <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[#98c1d9] hover:text-[#7db9de] transition-colors">@canchou</a></li>
        </ul>
      </div>
    </div>
  );
}