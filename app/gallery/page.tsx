import React from "react";

export default function GalleryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-gray-900 font-serif">相册</h1>
      <p className="text-sm text-gray-500 mb-8">光影瞬间，定格美好。</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gray-200/50 group-hover:bg-gray-200 transition-colors"></div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              图片 {i}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}