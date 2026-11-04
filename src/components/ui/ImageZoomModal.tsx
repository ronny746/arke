"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';

interface ImageZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
}

export default function ImageZoomModal({ imageUrl, onClose, altText = "Zoomed image" }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset scale and position when a new image is loaded
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  // Handle ESC key to close and +/- keys to zoom
  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.15, 0.5));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Top Toolbar */}
      <div
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-gray-900/80 border border-white/20 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <span className="text-xs font-semibold text-gray-300 min-w-[45px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomOut}
          className="p-1.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Reset Zoom (0 / R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/20 mx-1" />

        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        <button
          onClick={onClose}
          className="p-1.5 text-gray-200 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors ml-1"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt={altText}
          draggable={false}
          onMouseDown={handleMouseDown}
          className={`max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-75 ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 text-xs text-gray-400 pointer-events-none bg-black/40 px-3 py-1 rounded-full">
        Click anywhere outside or press ESC to close &bull; Scroll or use buttons to zoom
      </div>
    </div>
  );
}

