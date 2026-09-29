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

export default function SharedWhiteboard({ strokes }: { strokes: WhiteboardStroke[] }) {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear whole canvas
    ctx.clearRect(0, 0, canvasWidth, totalHeight);

    // Draw background grid lines
    ctx.save();
    ctx.strokeStyle = '#CBD5E1';
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
    ctx.restore();

    // Render strokes with destination-out composite operation for eraser so grid lines stay intact
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
  }, [strokes, totalHeight]);

  return (
    <div className="absolute inset-0 z-10 w-full h-full overflow-y-auto pointer-events-auto scrollbar-thin scrollbar-thumb-emerald-500/50">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={totalHeight}
        className="w-full block"
        style={{ height: `${(totalHeight / 1000) * 100}%`, minHeight: '100%' }}
      />
    </div>
  );
}


