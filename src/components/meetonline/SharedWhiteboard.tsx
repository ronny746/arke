'use client';

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

  const canvasWidth = 1000;
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
  ctx.strokeStyle = '#F1F5F9';
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

  // Draw strokes
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length < 2) continue;
    ctx.beginPath();
    const isEraser = stroke.isEraser || stroke.color === '#FFFFFF';
    ctx.strokeStyle = isEraser ? '#FFFFFF' : stroke.color;
    ctx.lineWidth = isEraser ? (stroke.width * 16) : (stroke.width * 3);
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

  // Slice into A4 PDF pages (A4 ratio ~ 1 : 1.414)
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
  if (!strokes.length) return null;

  // Calculate maximum vertical Y to dynamically adjust vertical scrollable viewBox height
  let maxY = 1.0;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      if (point.y > maxY) maxY = point.y;
    }
  }

  const svgHeight = Math.max(1000, Math.ceil(maxY * 1000));

  return (
    <div className="absolute inset-0 z-10 w-full h-full overflow-y-auto pointer-events-auto scrollbar-thin scrollbar-thumb-emerald-500/50">
      <svg
        aria-label="Live continuous vertical whiteboard"
        className="w-full pointer-events-none"
        style={{ height: `${(svgHeight / 1000) * 100}%`, minHeight: '100%' }}
        viewBox={`0 0 1000 ${svgHeight}`}
        preserveAspectRatio="none"
      >
        {strokes.map((stroke) => {
          const isEraser = stroke.isEraser || stroke.color === '#FFFFFF';
          const strokeColor = isEraser ? '#FFFFFF' : stroke.color;
          return (
            <polyline
              key={stroke.id}
              points={stroke.points.map((point) => `${point.x * 1000},${point.y * 1000}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isEraser ? (stroke.width * 14) : (stroke.width * 3)}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    </div>
  );
}

