
'use client';

import React from 'react';
import { Logo } from './logo';

const LogoAndName = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="animate-pulse">
            <Logo />
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
