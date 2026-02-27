'use client';

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

export default function KreatikaLogo({
  size = 32,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
}) {
  return (
    <div className="flex items-center gap-2" style={{ lineHeight: 1 }}>
      <svg
        viewBox="0 0 200 200"
        style={{ width: size, height: size, flexShrink: 0 }}
      >
        {edges.map((edge, i) => {
          const n1 = baseNodes.find((n) => n.id === edge[0])!;
          const n2 = baseNodes.find((n) => n.id === edge[1])!;
          return (
            <line
              key={`e-${i}`}
              x1={n1.x} y1={n1.y}
              x2={n2.x} y2={n2.y}
              stroke="#bed63a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}
        {baseNodes.map((node) => (
          <circle
            key={`n-${node.id}`}
            cx={node.x} cy={node.y}
            r="9"
            fill="#bed63a"
          />
        ))}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-sora)',
            fontWeight: 600,
            fontSize: size * 0.48,
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ color: '#fff' }}>Креа</span>
          <span style={{ color: '#B5D334' }}>тика</span>
        </span>
      )}
    </div>
  );
}
