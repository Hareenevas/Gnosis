import { useEffect, useState } from 'react';
import { api } from './api';

function Flashcards({ cards }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const go = (d) => { setFlip(false); setI((i + d + cards.length) % cards.length); };
  return (
    <div className="max-w-md mx-auto text-center space-y-3">
      <button onClick={() => setFlip(!flip)}
        className={`w-full h-48 rounded-xl shadow flex items-center justify-center p-6 text-lg ${flip ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
        {flip ? cards[i].back : cards[i].front}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button onClick={() => go(-1)} className="px-3 py-1 border rounded">Prev</button>
        <span>{i + 1} / {cards.length} · click card to flip</span>
        <button onClick={() => go(1)} className="px-3 py-1 border rounded">Next</button>
      </div>
    </div>
  );
}

function MindMap({ map }) {
  const W = 760, H = 560, cx = W / 2, cy = H / 2;
  const short = (s) => (s.length > 20 ? s.slice(0, 18) + '…' : s);
  const n = map.branches.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-white rounded-xl shadow">
      {map.branches.map((b, i) => {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        const bx = cx + 130 * Math.cos(a), by = cy + 130 * Math.sin(a);
        const kids = b.children || [];
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#a5b4fc" strokeWidth="3" />
            {kids.map((c, j) => {
              const ca = a + (j - (kids.length - 1) / 2) * 0.32;
              const x = cx + 240 * Math.cos(ca), y = cy + 240 * Math.sin(ca);
              return (
                <g key={j}>
                  <line x1={bx} y1={by} x2={x} y2={y} stroke="#d1d5db" strokeWidth="1.5" />
                  <circle cx={x} cy={y} r="4" fill="#6366f1" />
                  <text x={x} y={y - 9} textAnchor="middle" fontSize="11" fill="#374151">{short(c)}</text>
                </g>
              );
            })}
            <circle cx={bx} cy={by} r="9" fill="#4f46e5" />
            <text x={bx} y={by + 24} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#312e81">{short(b.label)}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="42" fill="#4f46e5" />
      <foreignObject x={cx - 42} y={cy - 26} width="84" height="52">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: '13px', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {map.root}
        </div>
      </foreignObject>
    </svg>
  );
}

export default function Study({ id }) {
  const [m, setM] = useState(null);
  const [view, setView] = useState('summary');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.study(id).then(setM).catch(e => setError(e.message)); }, [id]);

  const generate = async () => {
    setBusy(true); setError('');
    try { setM(await api.genContent(id)); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (error && !m) return <p className="text-red-600">{error}</p>;
  if (!m) return <p>Loading…</p>;
  if (!m.summary) return (
    <div className="bg-white p-6 rounded-xl shadow text-center space-y-3">
      <p>Generate a summary, flashcards and a mind map from your notes.</p>
      <button onClick={generate} disabled={busy} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
        {busy ? 'Generating…' : 'Generate study material'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['summary', 'flashcards', 'mindmap'].map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded-lg text-sm ${view === v ? 'bg-indigo-100 text-indigo-700' : 'border bg-white'}`}>
            {v === 'mindmap' ? 'Mind map' : v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
        <button onClick={generate} disabled={busy} className="ml-auto text-sm text-gray-500">{busy ? 'Regenerating…' : 'Regenerate'}</button>
      </div>
      {view === 'summary' && <div className="bg-white p-5 rounded-xl shadow whitespace-pre-line leading-relaxed">{m.summary}</div>}
      {view === 'flashcards' && <Flashcards cards={m.flashcards} />}
      {view === 'mindmap' && <MindMap map={m.mindmap} />}
    </div>
  );
}
