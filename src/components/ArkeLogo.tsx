'use client';

import React from 'react';

interface ArkeLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'brand';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  tagline?: string;
  badge?: string;
}

export default function ArkeLogo({
  className = '',
  variant = 'dark',
  size = 'md',
  showText = true,
  tagline,
  badge,
}: ArkeLogoProps) {
  const sizeConfig = {
    sm: {
      svgH: 'h-7',
      titleSize: 'text-lg',
      subSize: 'text-[9px] tracking-[0.25em]',
      badgeSize: 'text-[8px] px-1.5 py-0.5',
      gap: 'gap-2',
    },
    md: {
      svgH: 'h-9 sm:h-10',
      titleSize: 'text-xl sm:text-2xl',
      subSize: 'text-[10px] sm:text-[11px] tracking-[0.22em]',
      badgeSize: 'text-[9px] px-2 py-0.5',
      gap: 'gap-2.5',
    },
    lg: {
      svgH: 'h-11 sm:h-12',
      titleSize: 'text-2xl sm:text-3xl',
      subSize: 'text-xs sm:text-sm tracking-[0.22em]',
      badgeSize: 'text-[10px] px-2.5 py-0.5',
      gap: 'gap-3',
    },
    xl: {
      svgH: 'h-16 sm:h-20',
      titleSize: 'text-3xl sm:text-5xl',
      subSize: 'text-sm sm:text-lg tracking-[0.24em]',
      badgeSize: 'text-xs px-3 py-1',
      gap: 'gap-4',
    },
  };

  const currentSize = sizeConfig[size];

  // Colors based on variant
  // 'light' is for dark backgrounds (white text)
  // 'dark' is for light backgrounds (navy text)
  const isLightOnDark = variant === 'light';
  const navyColor = isLightOnDark ? '#FFFFFF' : '#23346B';
  const greenColor = isLightOnDark ? '#10B981' : '#0C8044';
  const chevronColor = isLightOnDark ? '#E2E8F0' : '#23346B';
  const arrowColor = isLightOnDark ? '#0B132B' : '#FFFFFF';

  return (
    <div className={`inline-flex items-center ${currentSize.gap} ${className}`}>
      {/* Official Geometric Roof + Green Base + Upward Arrow Mark */}
      <svg
        viewBox="0 0 180 160"
        className={`${currentSize.svgH} w-auto shrink-0 transition-transform duration-200 group-hover:scale-105`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Navy / Roof Chevron */}
        <path
          d="M 90 10 L 180 92 L 146 92 L 90 42 L 34 92 L 0 92 Z"
          fill={chevronColor}
        />

        {/* Green Polygon Base */}
        <path
          d="M 34 92 L 90 42 L 146 92 L 90 152 Z"
          fill={greenColor}
        />

        {/* Inner Arrow / Pillar */}
        <path
          d="M 90 64 L 114 88 L 100 88 L 100 142 L 80 142 L 80 88 L 66 88 Z"
          fill={arrowColor}
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-center gap-2">
            <span
              className={`font-black ${currentSize.titleSize} tracking-tight font-sans`}
              style={{ color: navyColor }}
            >
              ARKE
            </span>
            {badge && (
              <span
                className={`font-extrabold uppercase rounded-full tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 ${currentSize.badgeSize}`}
              >
                {badge}
              </span>
            )}
          </div>
          <span
            className={`font-bold ${currentSize.subSize} uppercase font-sans`}
            style={{ color: greenColor }}
          >
            {tagline || 'SCHOLARS'}
          </span>
        </div>
      )}
    </div>
  );
}
