'use client';

import { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

export type WhiteboardPoint = { x: number; y: number };
export type WhiteboardStroke = {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  width: number;
  isEraser?: boolean;
};

export async function generateWhiteboardPDF(strokes: WhiteboardStroke[], title = 'Whiteboard_Notes') {
  if (!strokes.length) return null;

  let maxY = 1.0;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      if (point.y > maxY) maxY = point.y;
    }
  }

  const canvasWidth = 1200;
  const viewportHeight = 1000;
  const totalHeight = Math.max(viewportHeight, Math.ceil(maxY * viewportHeight));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  // Draw grid lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  const gridSize = 35;
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, totalHeight);
    ctx.stroke();
  }
  for (let y = 0; y < totalHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Render strokes
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length < 2) continue;
    ctx.beginPath();
    const isEraser = stroke.isEraser || stroke.color === '#FFFFFF';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.width * 14;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * 3;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const first = stroke.points[0];
    ctx.moveTo(first.x * canvasWidth, first.y * viewportHeight);
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      ctx.lineTo(pt.x * canvasWidth, pt.y * viewportHeight);
    }
    ctx.stroke();
  }

  // Slice into A4 PDF pages
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const pageCanvasHeight = Math.round(canvasWidth * (pdfHeight / pdfWidth));

  let currentY = 0;
  let pageIndex = 0;

  while (currentY < totalHeight) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = pageCanvasHeight;
    const pageCtx = pageCanvas.getContext('2d');
    if (pageCtx) {
      pageCtx.fillStyle = '#FFFFFF';
      pageCtx.fillRect(0, 0, canvasWidth, pageCanvasHeight);
      pageCtx.drawImage(
        canvas,
        0, currentY, canvasWidth, pageCanvasHeight,
        0, 0, canvasWidth, pageCanvasHeight
      );
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
    currentY += pageCanvasHeight;
    pageIndex++;
  }

  const blob = pdf.output('blob');
  const filename = `${title}_${Date.now()}.pdf`;
  return { blob, filename, pdf };
}

export type WhiteboardDocState = {
  docName?: string;
  docType?: string;
  docBase64?: string;
  docUrl?: string;
  viewMode?: 'split' | 'overlay' | 'whiteboard';
} | null;

export default function SharedWhiteboard({
  strokes,
  docState = null,
}: {
  strokes: WhiteboardStroke[];
  docState?: WhiteboardDocState;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate maximum vertical Y to dynamically adjust vertical canvas height
  let maxY = 1.0;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      if (point.y > maxY) maxY = point.y;
    }
  }

  const canvasWidth = 1200;
  const viewportHeight = 1000;
  const totalHeight = Math.max(viewportHeight, Math.ceil(maxY * viewportHeight));
  const hasDoc = Boolean(docState && (docState.docBase64 || docState.docUrl));
  const isSplitMode = hasDoc && docState?.viewMode === 'split';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear whole canvas
    ctx.clearRect(0, 0, canvasWidth, totalHeight);

    // Plain pure white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    // If in overlay mode, draw the document on the canvas background
    if (hasDoc && docState?.viewMode === 'overlay' && (docState.docBase64 || docState.docUrl)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const aspect = img.width / img.height;
        const drawWidth = canvasWidth * 0.9;
        const drawHeight = drawWidth / aspect;
        ctx.drawImage(img, (canvasWidth - drawWidth) / 2, 40, drawWidth, drawHeight);
        
        // Re-render strokes over image
        renderStrokes(ctx);
      };
      img.src = docState.docBase64 || docState.docUrl || '';
    } else {
      renderStrokes(ctx);
    }

    function renderStrokes(c: CanvasRenderingContext2D) {
      for (const stroke of strokes) {
        if (!stroke.points || stroke.points.length < 2) continue;
        c.beginPath();
        const isEraser = stroke.isEraser || stroke.color === '#FFFFFF';
        if (isEraser) {
          c.globalCompositeOperation = 'destination-out';
          c.lineWidth = stroke.width * 14;
        } else {
          c.globalCompositeOperation = 'source-over';
          c.strokeStyle = stroke.color;
          c.lineWidth = stroke.width * 3;
        }
        c.lineCap = 'round';
        c.lineJoin = 'round';

        const first = stroke.points[0];
        c.moveTo(first.x * canvasWidth, first.y * viewportHeight);
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          c.lineTo(pt.x * canvasWidth, pt.y * viewportHeight);
        }
        c.stroke();
      }
    }
  }, [strokes, totalHeight, docState, hasDoc]);

  return (
    <div className="absolute inset-0 z-10 w-full h-full flex flex-col md:flex-row overflow-y-auto pointer-events-auto scrollbar-thin scrollbar-thumb-emerald-500/50 bg-white">
      {/* Split view: Left document panel */}
      {isSplitMode && (
        <div className="w-full md:w-1/2 h-full border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-start overflow-y-auto">
          <div className="w-full max-w-xl bg-white p-3 rounded-2xl shadow-md border border-slate-200 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 truncate">📄 {docState?.docName || 'Imported Document'}</span>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">{docState?.docType || 'DOC'}</span>
          </div>
          <div className="w-full flex-1 flex items-center justify-center p-2">
            <img
              src={docState?.docBase64 || docState?.docUrl}
              alt={docState?.docName || 'Imported document page'}
              className="max-w-full max-h-[800px] object-contain rounded-xl shadow-lg border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* Right/Full Whiteboard Canvas */}
      <div className={`relative ${isSplitMode ? 'w-full md:w-1/2' : 'w-full'} h-full min-h-[1000px]`}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={totalHeight}
          className="w-full block"
          style={{ height: `${(totalHeight / 1000) * 100}%`, minHeight: '100%' }}
        />
      </div>
    </div>
  );
}


