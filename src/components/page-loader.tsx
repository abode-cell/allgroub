
'use client';

import React from 'react';

const LogoAndName = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary animate-pulse"
        >
            <path
                d="M12 2L4.5 17.5H19.5L12 2Z"
                fill="currentColor"
                fillOpacity="0.1"
            />
            <path
                d="M12 2L2 22H22L12 2Z"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 11.5L8 19.5"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 11.5L16 19.5"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
        <div className="flex flex-col items-center">
            <span className="font-bold text-2xl text-foreground leading-tight">مجموعة عال</span>
            <span className="text-sm text-muted-foreground tracking-wide">إدارة • تمويل • تطوير • وأكثر...</span>
        </div>
         <p className="text-lg text-muted-foreground mt-4 animate-pulse">جاري التحميل...</p>
    </div>
);


export const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LogoAndName />
    </div>
  );
};
