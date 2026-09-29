'use client';

export type WhiteboardPoint = { x: number; y: number };
export type WhiteboardStroke = {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  width: number;
};

export default function SharedWhiteboard({ strokes }: { strokes: WhiteboardStroke[] }) {
  if (!strokes.length) return null;

  return (
    <svg
      aria-label="Live whiteboard shared from the teacher's app"
      className="absolute inset-0 z-10 h-full w-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
    >
      {strokes.map((stroke) => (
        <polyline
          key={stroke.id}
          points={stroke.points.map((point) => `${point.x * 1000},${point.y * 1000}`).join(' ')}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width * 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
