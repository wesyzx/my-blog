import React from "react";

export default function GalleryPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="card p-[30px] md:p-[40px]">
        <h1 className="text-[30px] font-bold mb-2" style={{ color: 'var(--color-heading)' }}>
          相册
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-muted)' }}>
          光影瞬间，定格美好。
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-[5px] overflow-hidden relative group cursor-pointer"
              style={{ backgroundColor: 'var(--color-tag-bg)' }}
            >
              <div
                className="absolute inset-0 transition-colors duration-300"
                style={{ backgroundColor: 'var(--color-card-overlay)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium transition-transform duration-300 group-hover:scale-110"
                style={{ color: 'var(--color-muted)' }}
              >
                图片 {i}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
