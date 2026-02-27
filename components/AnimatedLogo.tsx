'use client';

import { useEffect, useRef, useState, useMemo } from "react";

function useAnimationFrame(callback: (time: number) => void) {
  const requestRef = useRef<number | null>(null);
  const animate = (time: number) => {
    callback(time);
    requestRef.current = requestAnimationFrame(animate);
  };
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
}

const baseNodes = [
  { id: 1, x: 54, y: 52 },
  { id: 2, x: 54, y: 100 },
  { id: 3, x: 54, y: 148 },
  { id: 4, x: 98, y: 100 },
  { id: 5, x: 142, y: 52 },
  { id: 6, x: 146, y: 148 },
];

const edges = [
  [1, 2], [2, 3], [2, 5], [2, 6], [4, 3], [4, 5], [4, 6],
];

/**
 * Animated logo with floating nodes and edges.
 * - Default (no props): full version with bg container
 * - size + inline: compact SVG-only version for loaders
 */
export default function AnimatedLogo({
  size,
  inline,
}: {
  /** Width/height in px for compact mode */
  size?: number;
  /** If true, renders bare SVG without container */
  inline?: boolean;
} = {}) {
  const [t, setT] = useState(0);
  useAnimationFrame((time) => { setT(time); });

  const animParams = useMemo(() => {
    return baseNodes.map(() => ({
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.0003 + Math.random() * 0.0002,
      speedY: 0.0003 + Math.random() * 0.0002,
    }));
  }, []);

  const currentNodes = baseNodes.map((node, i) => {
    const params = animParams[i];
    const offsetX = Math.sin(t * params.speedX + params.phaseX) * 2 + Math.sin(t * params.speedX * 0.6 + params.phaseY) * 1;
    const offsetY = Math.cos(t * params.speedY + params.phaseY) * 2 + Math.cos(t * params.speedY * 0.6 + params.phaseX) * 1;
    return { ...node, cx: node.x + offsetX, cy: node.y + offsetY };
  });

  const svgContent = (
    <svg viewBox="0 0 200 200" style={inline && size ? { width: size, height: size } : { width: '100%', height: '100%' }}>
      {edges.map((edge, i) => {
        const n1 = currentNodes.find((n) => n.id === edge[0])!;
        const n2 = currentNodes.find((n) => n.id === edge[1])!;
        return (
          <line key={`edge-${i}`} x1={n1.cx} y1={n1.cy} x2={n2.cx} y2={n2.cy} stroke="#bed63a" strokeWidth="3.5" strokeLinecap="round" />
        );
      })}
      {currentNodes.map((node) => (
        <circle key={`node-${node.id}`} cx={node.cx} cy={node.cy} r="9" fill="#bed63a" />
      ))}
    </svg>
  );

  if (inline) {
    return svgContent;
  }

  return (
    <div className="flex items-center justify-center w-full h-full p-8">
      <div className="w-full max-w-md aspect-square shadow-2xl rounded-[40px] overflow-hidden bg-[#1a1b20]">
        {svgContent}
      </div>
    </div>
  );
}
