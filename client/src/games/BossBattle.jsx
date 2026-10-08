import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const Bar = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-sm"><span>{label}</span><span>{Math.max(0, value)}</span></div>
    <div className="h-3 bg-gray-200 rounded"><div className={`h-3 rounded ${color} transition-all`} style={{ width: `${Math.max(0, value)}%` }} /></div>
  </div>
);

export default function BossBattle({ id }) {
  const [boss, setBoss] = useState(100);
  const [hero, setHero] = useState(100);
  const [q, setQ] = useState(null);
  const [res, setRes] = useState(null);
  const [outcome, setOutcome] = useState(null); // won | lost | empty
  const [error, setError] = useState('');
  const t0 = useRef(Date.now());
  const reported = useRef(false);

  const next = async () => {
    try {
      setRes(null);
      const n = await api.nextQuestion(id);
      if (n.done) return setOutcome('empty');
      setQ(n); t0.current = Date.now();
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { next(); }, []);

  const finish = (won) => {
    setOutcome(won ? 'won' : 'lost');
    if (!reported.current) {
      reported.current = true;
      api.gameResult({ materialId: id, game: 'boss', score: won ? 150 : 40, won }).catch(() => {});
    }
  };

  const pick = async (i) => {
    if (res) return;
    const r = await api.answer({ questionId: q.id, selectedIndex: i, timeMs: Date.now() - t0.current });
    setRes({ ...r, picked: i });
    if (r.correct) {
      const nb = boss - 12 * q.difficulty; setBoss(nb);
      if (nb <= 0) finish(true);
    } else {
      const nh = hero - 20; setHero(nh);
      if (nh <= 0) finish(false);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (outcome) return (
    <div className="bg-white p-6 rounded-xl shadow text-center space-y-2">
      <div className="text-3xl">{outcome === 'won' ? '🏆' : outcome === 'lost' ? '💀' : '📚'}</div>
      <p className="font-semibold">
        {outcome === 'won' ? 'Boss defeated! +150 XP' : outcome === 'lost' ? 'The boss won this time. Review and retry!' : 'You have answered every question. Regenerate the quiz for more.'}
      </p>
    </div>
  );
  if (!q) return <p>Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white p-4 rounded-xl shadow space-y-3">
        <div className="text-center font-semibold">👹 The Cramming Colossus</div>
        <Bar label="Boss HP" value={boss} color="bg-red-500" />
        <Bar label="Your HP" value={hero} color="bg-green-500" />
      </div>
      <div className="text-sm text-gray-500">{q.topic} · harder questions hit harder</div>
      <h2 className="text-lg font-semibold">{q.text}</h2>
      <div className="space-y-2">
        {q.options.map((o, i) => {
          let st = 'border bg-white hover:bg-gray-50';
          if (res) st = i === res.correctIndex ? 'border-green-600 bg-green-50' : i === res.picked ? 'border-red-600 bg-red-50' : 'border bg-white';
          return <button key={i} disabled={!!res} onClick={() => pick(i)} className={`w-full text-left p-3 rounded-lg ${st}`}>{o}</button>;
        })}
      </div>
      {res && (
        <div className="p-3 rounded-lg bg-blue-50">
          <p>{res.correct ? '⚔️ Direct hit!' : '💥 The boss strikes back!'} {res.explanation}</p>
          {boss > 0 && hero > 0 && <button onClick={next} className="mt-2 px-4 py-2 rounded bg-indigo-600 text-white">Next round</button>}
        </div>
      )}
    </div>
  );
}
