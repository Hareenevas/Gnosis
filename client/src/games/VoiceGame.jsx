import { useMemo, useRef, useState } from 'react';
import { api } from '../api';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

const LEVELS = { starting: ['starting'], intermediate: ['starting', 'intermediate'], pro: ['starting', 'intermediate', 'pro'] };
const COLS = 4, GX = 170, GY = 120, PASS = 0.75;

export default function VoiceGame({ id, terms }) {
  const [level, setLevel] = useState(null);
  const [cur, setCur] = useState(0);
  const [heard, setHeard] = useState('');
  const [score, setScore] = useState(null);
  const [fails, setFails] = useState(0);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const passed = useRef([]); const failed = useRef([]);

  const nodes = useMemo(() => {
    if (!level) return [];
    return terms.filter(t => LEVELS[level].includes(t.level)).slice(0, 8).map((t, i) => {
      const row = Math.floor(i / COLS), c = i % COLS;
      const col = row % 2 === 0 ? c : COLS - 1 - c; // snake layout keeps connectors right-angled
      return { ...t, x: 90 + col * GX, y: 60 + row * GY };
    });
  }, [level]);

  const hex = (x, y, r = 38) => [0, 1, 2, 3, 4, 5].map(k => {
    const a = (Math.PI / 3) * k; return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(' ');

  const advance = (ok, node) => {
    (ok ? passed : failed).current.push(node.topic);
    setFails(0); setHeard(''); setScore(null); setTyped('');
    if (cur + 1 >= nodes.length) {
      setDone(true);
      api.gameResult({ materialId: id, game: 'voice', score: passed.current.length * 20,
        correctTopics: passed.current, wrongTopics: failed.current }).catch(() => {});
    } else setCur(cur + 1);
  };

  const judge = (transcripts) => {
    const node = nodes[cur];
    const best = Math.max(...transcripts.map(t => similarity(t, node.term)));
    setHeard(transcripts[0]); setScore(best);
    if (best >= PASS) setTimeout(() => advance(true, node), 900); else setFails(f => f + 1);
  };

  const listen = () => {
    const rec = new SR();
    rec.lang = 'en-US'; rec.maxAlternatives = 3; rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setHeard('(could not hear you, try again)'); };
    rec.onresult = (e) => judge([...e.results[0]].map(a => a.transcript));
    rec.start();
  };

  if (!level) return (
    <div className="bg-white p-6 rounded-xl shadow text-center space-y-3">
      <h2 className="font-semibold">Circuit Trace: choose your level</h2>
      <p className="text-sm text-gray-500">Say each term aloud to power the next node. Harder levels add tougher terms.</p>
      {!SR && <p className="text-sm text-amber-600">Your browser has no speech recognition (use Chrome or Edge), so you'll type the terms instead.</p>}
      <div className="flex justify-center gap-2">
        {Object.keys(LEVELS).map(l => <button key={l} onClick={() => setLevel(l)} className="px-4 py-2 rounded-lg border capitalize hover:bg-indigo-50">{l}</button>)}
      </div>
    </div>
  );

  const node = nodes[cur];
  const rows = Math.ceil(nodes.length / COLS);
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${90 + (COLS - 1) * GX + 90} ${60 + (rows - 1) * GY + 70}`} className="w-full bg-slate-900 rounded-xl">
        {nodes.slice(1).map((n, i) => {
          const p = nodes[i];
          return <polyline key={i} points={`${p.x},${p.y} ${p.x},${n.y} ${n.x},${n.y}`} fill="none"
            stroke={i < cur ? '#22d3ee' : '#334155'} strokeWidth="3" />;
        })}
        {nodes.map((n, i) => {
          const state = i < cur || done ? 'done' : i === cur ? 'active' : 'locked';
          const fill = { done: '#0e7490', active: '#0f172a', locked: '#1e293b' }[state];
          const stroke = { done: '#22d3ee', active: '#facc15', locked: '#475569' }[state];
          return (
            <g key={i}>
              <polygon points={hex(n.x, n.y)} fill={fill} stroke={stroke} strokeWidth="3" />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontFamily="monospace" fontSize="11" fill={state === 'locked' ? '#64748b' : '#e2e8f0'}>
                {state === 'locked' ? '???' : n.term.length > 11 ? n.term.slice(0, 10) + '…' : n.term}
              </text>
            </g>
          );
        })}
      </svg>

      {done ? (
        <div className="bg-white p-4 rounded-xl shadow text-center">
          Circuit complete! {passed.current.length} / {nodes.length} terms powered · +{passed.current.length * 20} XP
        </div>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow space-y-3 text-center">
          <div className="text-xs uppercase tracking-wide text-gray-400">Node {cur + 1} of {nodes.length}</div>
          <div className="font-mono text-2xl">{node.term}</div>
          <div className="text-sm text-gray-500">{node.definition}</div>
          {SR ? (
            <button onClick={listen} disabled={listening} className="px-5 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
              {listening ? 'Listening…' : '🎤 Say it'}
            </button>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); judge([typed]); }} className="flex gap-2 justify-center">
              <input className="border rounded-lg px-3 py-2" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type the term" />
              <button className="px-4 rounded-lg bg-indigo-600 text-white">Check</button>
            </form>
          )}
          {score !== null && (
            <p className={score >= PASS ? 'text-green-600' : 'text-red-600'}>
              Heard "{heard}" · {Math.round(score * 100)}% match {score >= PASS ? '✓ node powered!' : '✗ try again'}
            </p>
          )}
          {fails >= 3 && <button onClick={() => advance(false, node)} className="text-sm text-gray-500 underline">Skip this term</button>}
        </div>
      )}
    </div>
  );
}
