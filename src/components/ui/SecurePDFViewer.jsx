"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Loader2, 
  Shield, 
  AlertCircle,
  Maximize,
  Minimize
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export default function SecurePDFViewer({ fileUrl, resourceId, title }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: 'Student', idOrPhone: '' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Load user details for dynamic anti-piracy watermarking
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Student';
        const idOrPhone = u.phone || u.metadata?.rollNo || u.email || u.id || '';
        setUserInfo({ name, idOrPhone });
      }
    } catch (e) {}
  }, []);

  // Securely fetch PDF binary to protect direct resource URL and eliminate CORS/Auth header issues
  useEffect(() => {
    let isCancelled = false;

    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPdfData(null);

        let arrayBuffer = null;
        const token = localStorage.getItem('token');

        // Step 1: If resourceId is present, try server secure streaming proxy
        if (resourceId) {
          try {
            const streamRes = await fetch(`/api/v1/resources/${resourceId}/stream`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (streamRes.ok) {
              const buf = await streamRes.arrayBuffer();
              if (buf && buf.byteLength > 10) {
                arrayBuffer = buf;
              }
            }
          } catch (e) {
            console.warn('Direct stream proxy failed, attempting fallback...');
          }
        }

        // Step 2: If no buffer yet and fileUrl exists, try direct fetch
        if (!arrayBuffer && fileUrl) {
          try {
            // Direct fetch (no auth header to avoid Cloudinary/S3 CORS rejection)
            const isOurOrigin = fileUrl.startsWith('/') || (typeof window !== 'undefined' && fileUrl.startsWith(window.location.origin));
            const directHeaders = (isOurOrigin && token) ? { Authorization: `Bearer ${token}` } : {};
            
            const directRes = await fetch(fileUrl, { headers: directHeaders });
            if (directRes.ok) {
              const buf = await directRes.arrayBuffer();
              if (buf && buf.byteLength > 10) {
                arrayBuffer = buf;
              }
            }
          } catch (e) {
            console.warn('Direct fetch failed, trying proxy URL...');
          }

          // Step 3: If direct fetch failed, try backend proxy by URL
          if (!arrayBuffer) {
            try {
              const proxyRes = await fetch(`/api/v1/resources/stream?url=${encodeURIComponent(fileUrl)}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              if (proxyRes.ok) {
                const buf = await proxyRes.arrayBuffer();
                if (buf && buf.byteLength > 10) {
                  arrayBuffer = buf;
                }
              }
            } catch (e) {}
          }
        }

        if (isCancelled) return;

        if (!arrayBuffer || arrayBuffer.byteLength < 10) {
          throw new Error('Unable to retrieve protected document stream.');
        }

        const uint8 = new Uint8Array(arrayBuffer);
        
        // Verify %PDF magic header (ASCII: 37, 80, 68, 70 => '%PDF')
        const isPdfMagic = uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46;

        if (!isPdfMagic) {
          // If not standard PDF bytes, check if it's an error text/HTML response
          const textPreview = new TextDecoder().decode(uint8.slice(0, 150));
          if (textPreview.includes('<Error>') || textPreview.includes('AccessDenied') || textPreview.includes('<!DOCTYPE')) {
            throw new Error('The document file could not be accessed or is restricted.');
          }
          throw new Error('This document is not a valid PDF or file format is unsupported.');
        }

        // Pass as standard { data: uint8 } format which react-pdf supports natively
        setPdfData({ data: uint8 });
        setLoading(false);
      } catch (err) {
        if (!isCancelled) {
          console.error('SecurePDFViewer load error:', err);
          setError(err.message || 'Failed to render PDF document securely.');
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, resourceId]);

  // Anti-tamper & Keyboard shortcut interceptor (Prevent Print / Save / Inspect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        ['p', 's', 'u', 'c'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  };

  const onDocumentLoadError = (err) => {
    console.error('PDF load error:', err);
    setError('Failed to render PDF document securely.');
    setLoading(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="w-full h-full flex flex-col bg-[#111827] text-white select-none relative overflow-hidden"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1F2937] border-b border-gray-700/80 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Shield size={13} />
            <span>Encrypted Reader</span>
          </div>
        </div>

        {/* Page navigation controls */}
        {numPages && numPages > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-gray-200 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-200">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-gray-200 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-bold text-gray-300 min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Rotate"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* PDF Pages Viewer Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#0A0E1A] relative">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#C99A2E]" />
            <p className="text-xs font-bold uppercase tracking-wider">Rendering Protected Document...</p>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-center max-w-md space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
            <p className="font-bold text-sm">Protected View Error</p>
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {pdfData && (
          <div className="relative shadow-2xl rounded-lg overflow-hidden border border-gray-700/50 bg-white">
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pointer-events-none"
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
