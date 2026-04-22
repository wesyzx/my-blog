import React from "react";

export default function MessagePage() {
  return (
    <div className="bg-white rounded-[5px] p-[30px] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)]">
      <h1 className="text-[30px] font-bold mb-[30px] text-[#293241]">留言板</h1>
      
      <div className="bg-[#f3f4f7] rounded-[5px] p-[20px] mb-[40px] border border-[#e7e9ef]">
        <textarea 
          className="w-full bg-white border border-[#e7e9ef] rounded-[5px] p-[15px] text-[16px] focus:outline-none focus:border-[#98c1d9] transition-all min-h-[120px]" 
          placeholder="说点什么吧..."
        />
        <div className="mt-[15px] flex justify-end">
          <button className="bg-[#98c1d9] text-white px-[25px] py-[10px] rounded-[5px] text-[15px] font-medium hover:bg-[#7db9de] transition-colors">
            提交留言
          </button>
        </div>
      </div>

      <div className="space-y-[30px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-[20px] border-b border-[#e7e9ef] pb-[30px] last:border-0">
            <div className="w-[50px] h-[50px] bg-[#f3f4f7] rounded-full flex-shrink-0 flex items-center justify-center text-[#475671] font-bold text-[20px]">
              {i}
            </div>
            <div>
              <div className="flex items-center gap-[10px] mb-[5px]">
                <span className="font-bold text-[#293241] text-[16px]">访客 {i}</span>
                <span className="text-[12px] font-semibold text-[#475671] uppercase">2026年{i}月1日</span>
              </div>
              <p className="text-[#475671] text-[16px] leading-[1.65]">
                这是一条测试留言，非常喜欢这个博客的极简风格！页面排版很干净，阅读体验非常棒。
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}