import React from "react";

export default function MessagePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-gray-900 font-serif">留言板</h1>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-10 border border-gray-100">
        <textarea 
          className="w-full bg-white border border-gray-200 rounded p-3 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all" 
          rows={4} 
          placeholder="说点什么吧..."
        />
        <div className="mt-3 flex justify-end">
          <button className="bg-gray-900 text-white px-6 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
            提交留言
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 pb-6 last:border-0">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 font-bold">
              {i}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-medium text-gray-900 text-sm">访客 {i}</span>
                <span className="text-xs text-gray-400">2026年{i}月1日</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                这是一条测试留言，非常喜欢这个博客的极简风格！页面排版很干净，阅读体验非常棒。
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}