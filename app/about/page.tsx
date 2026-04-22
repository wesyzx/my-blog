import React from "react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-gray-900 font-serif">关于</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          你好，我是 <strong>Can Chou</strong>。<br/>
          欢迎来到我的个人自留地 <em>The Unhurried</em>。
        </p>

        <p className="text-gray-600 leading-relaxed mb-6">
          这里记录了我的日常生活、折腾的技术心得、随手拍摄的照片，以及学习过程中的点滴感悟。
          在这个快节奏的时代里，我希望能够“不慌不忙”地去体验生活，记录下那些微小但确切的幸福（Everything happens for the best）。
        </p>

        <hr className="my-8 border-gray-100" />

        <h3 className="text-lg font-bold text-gray-900 mb-4">联系我</h3>
        <ul className="list-disc pl-5 text-gray-600 space-y-2">
          <li>Email: <a href="mailto:hi@example.com" className="text-blue-600 hover:underline">hi@example.com</a></li>
          <li>GitHub: <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@canchou</a></li>
          <li>Twitter: <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@canchou</a></li>
        </ul>
      </div>
    </div>
  );
}