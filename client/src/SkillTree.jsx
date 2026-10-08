import { useEffect, useState } from 'react';
import { api } from './api';

const COLORS = { locked: '#9ca3af', weak: '#f87171', learning: '#facc15', mastered: '#22c55e' };

export default function SkillTree({ materialId }) {
  const [nodes, setNodes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.skillTree(materialId).then(setNodes).catch(e => setError(e.message)); }, [materialId]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!nodes) return <p>Loading…</p>;

  const W = 640, H = 480, cx = W / 2, cy = H / 2, R = 180;
  const pos = nodes.map((n, i) => {
    const a = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return { ...n, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {pos.map(n => (
          <line key={'l' + n.topic} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="#d1d5db" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r="34" fill="#4f46e5" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontWeight="bold">Gnosis</text>
        {pos.map(n => {
          const r = 24 + n.mastery * 18;
          return (
            <g key={n.topic}>
              <circle cx={n.x} cy={n.y} r={r} fill={COLORS[n.status]} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#111827">
                {Math.round(n.mastery * 100)}%
              </text>
              <text x={n.x} y={n.y + r + 16} textAnchor="middle" fontSize="12" fill="#374151">
                {n.topic.length > 24 ? n.topic.slice(0, 22) + '…' : n.topic}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 justify-center text-sm mt-2">
        {Object.entries(COLORS).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: c }} /> {k}
          </span>
        ))}
      </div>
    </div>
  );
}
