"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react';

import { useRouter } from 'next/navigation';

interface Banner {
  _id: string;
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive?: boolean;
}

interface BannerCarouselProps {
  className?: string;
  aspectRatio?: string; // default "aspect-[16/9]"
  maxHeight?: string; // default "max-h-[220px] sm:max-h-[280px] md:max-h-[320px]"
  autoPlayInterval?: number; // in ms, default 5000
}

export function BannerCarousel({ 
  className = '', 
  aspectRatio = 'aspect-[16/9]', 
  maxHeight = 'max-h-[220px] sm:max-h-[280px] md:max-h-[320px]',
  autoPlayInterval = 5000 
}: BannerCarouselProps) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/public/banners');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setBanners(data.data.filter((b: Banner) => b.isActive !== false));
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [banners.length, autoPlayInterval]);

  const handleNext = () => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading) {
    return (
      <div className={`w-full ${aspectRatio} ${maxHeight} bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse flex items-center justify-center ${className}`}>
        <ImageIcon className="text-gray-300 dark:text-gray-600 animate-bounce" size={40} />
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Gracefully hide if no banners exist
  }

  const currentBanner = banners[currentIndex];

  const handleBannerClick = () => {
    if (!currentBanner?.linkUrl || !currentBanner.linkUrl.trim()) return;

    const rawUrl = currentBanner.linkUrl.trim();

    if (rawUrl.startsWith('/')) {
      router.push(rawUrl);
    } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://${rawUrl}`, '_blank', 'noopener,noreferrer');
    }
  };

  const hasLink = !!(currentBanner?.linkUrl && currentBanner.linkUrl.trim());

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl group shadow-xl border border-gray-100 dark:border-gray-800 ${className}`}>
      {/* 16:9 Aspect Ratio Container with max-height constraint */}
      <div 
        className={`w-full ${aspectRatio} ${maxHeight} relative overflow-hidden bg-black/90 ${hasLink ? 'cursor-pointer' : ''}`} 
        onClick={handleBannerClick}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentBanner._id}
            src={currentBanner.imageUrl}
            alt={currentBanner.title || 'Banner'}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full object-contain mx-auto"
          />
        </AnimatePresence>

        {/* Title & Link Overlay */}
        {(currentBanner.title || currentBanner.linkUrl) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 md:p-6 text-white flex items-end justify-between pointer-events-none">
            {currentBanner.title && (
              <h3 className="text-lg md:text-2xl font-bold font-display drop-shadow-md leading-tight line-clamp-1">
                {currentBanner.title}
              </h3>
            )}
            {currentBanner.linkUrl && (
              <span className="text-xs font-bold bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 ml-auto border border-white/30 text-white transition-all shadow-md pointer-events-auto cursor-pointer">
                Learn More <ExternalLink size={12} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Left/Right Navigation Arrows (Only show if > 1 banner) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95 shadow-lg z-10"
            aria-label="Previous Banner"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95 shadow-lg z-10"
            aria-label="Next Banner"
          >
            <ChevronRight size={22} />
          </button>

          {/* Dot Pagination Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-black/30 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
