import React from "react";

export default function GalleryPage() {
  return (
    <div className="bg-white rounded-[5px] p-[30px] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)]">
      <h1 className="text-[30px] font-bold mb-8 text-[#293241]">相册</h1>
      <p className="text-[16px] text-[#475671] mb-8 leading-[1.65]">光影瞬间，定格美好。</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="aspect-square bg-[#f3f4f7] rounded-[5px] overflow-hidden relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-[#475671]/10 group-hover:bg-transparent transition-colors duration-300"></div>
            <div className="absolute inset-0 flex items-center justify-center text-[#475671] text-sm">
              图片 {i}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}